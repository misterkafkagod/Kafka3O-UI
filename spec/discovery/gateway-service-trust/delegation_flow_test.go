// Throwaway discovery prototype: Console -> Gateway -> policy API with single-use delegations over mTLS.
package gatewayservicetrust

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"sort"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

type delegation struct {
	binding [32]byte
	expires time.Time
}

type policyService struct {
	mu      sync.Mutex
	pending map[[32]byte]delegation // keyed by SHA-256 of the handle; the handle itself is never stored
	delay   atomic.Int64
}

func (p *policyService) mint(binding [32]byte, lifetime time.Duration) string {
	raw := make([]byte, 32)
	rand.Read(raw)
	handle := base64.RawURLEncoding.EncodeToString(raw)
	p.mu.Lock()
	p.pending[sha256.Sum256([]byte(handle))] = delegation{binding, time.Now().Add(lifetime)}
	p.mu.Unlock()
	return handle
}

// consume atomically removes the delegation and allows only an unexpired, exactly matching request.
func (p *policyService) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	time.Sleep(time.Duration(p.delay.Load()))
	var body struct {
		Handle  string `json:"handle"`
		Binding []byte `json:"binding"`
	}
	if r.TLS == nil || len(r.TLS.PeerCertificates) == 0 || json.NewDecoder(r.Body).Decode(&body) != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	key := sha256.Sum256([]byte(body.Handle))
	p.mu.Lock()
	entry, ok := p.pending[key]
	delete(p.pending, key)
	p.mu.Unlock()
	allowed := ok && time.Now().Before(entry.expires) && len(body.Binding) == 32 && [32]byte(body.Binding) == entry.binding
	json.NewEncoder(w).Encode(map[string]bool{"allowed": allowed})
}

func TestDelegationFlowLatencyReplayExpiryAndPolicyTimeout(t *testing.T) {
	ca := issue(t, nil, "Kafka3O service CA", "", true, nil, time.Now().Add(time.Hour))
	pool := x509.NewCertPool()
	pool.AddCert(ca.cert)
	serverUsage := []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}
	clientUsage := []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
	consoleClient := issue(t, ca, "console", "spiffe://kafka3o/console", false, clientUsage, time.Now().Add(time.Hour))
	consoleServer := issue(t, ca, "console-policy", "spiffe://kafka3o/console", false, serverUsage, time.Now().Add(time.Hour), "localhost")
	gatewayServer := issue(t, ca, "gateway-prod", "spiffe://kafka3o/gateway/prod", false, serverUsage, time.Now().Add(time.Hour), "localhost")
	gatewayClient := issue(t, ca, "gateway-prod", "spiffe://kafka3o/gateway/prod", false, clientUsage, time.Now().Add(time.Hour))

	policy := &policyService{pending: map[[32]byte]delegation{}}
	policyServer := httptest.NewUnstartedServer(policy)
	policyServer.TLS = &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{consoleServer.tls()},
		ClientAuth: tls.RequireAndVerifyClientCert, ClientCAs: pool, VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/gateway/prod")}
	policyServer.StartTLS()
	defer policyServer.Close()
	policyClient := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: pool, ServerName: "localhost",
		Certificates: []tls.Certificate{gatewayClient.tls()}, VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/console")}}}

	var kafkaCalls atomic.Int64
	gateway := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		binding := canonical("prod", r.Method, r.URL.EscapedPath(), r.URL.Query(), body)
		payload, _ := json.Marshal(map[string]any{"handle": r.Header.Get("X-Kafka3O-Delegation"), "binding": binding[:]})
		ctx, cancel := context.WithTimeout(r.Context(), time.Second)
		defer cancel()
		request, _ := http.NewRequestWithContext(ctx, http.MethodPost, policyServer.URL+"/internal/v1/delegations/consume", bytesReader(payload))
		response, err := policyClient.Do(request)
		if err != nil {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		defer response.Body.Close()
		var decision struct{ Allowed bool }
		if json.NewDecoder(response.Body).Decode(&decision) != nil || !decision.Allowed {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		kafkaCalls.Add(1)
		w.WriteHeader(http.StatusOK)
	}))
	gateway.TLS = &tls.Config{MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{gatewayServer.tls()},
		ClientAuth: tls.RequireAndVerifyClientCert, ClientCAs: pool, VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/console")}
	gateway.StartTLS()
	defer gateway.Close()
	consoleTransport := &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: pool, ServerName: "localhost",
		Certificates: []tls.Certificate{consoleClient.tls()}, VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/gateway/prod")}}
	console := &http.Client{Transport: consoleTransport, Timeout: 5 * time.Second}

	forward := func(handle string) (int, time.Duration) {
		start := time.Now()
		request, _ := http.NewRequest(http.MethodDelete, gateway.URL+"/api/v1/topics/orders", nil)
		request.Header.Set("X-Kafka3O-Delegation", handle)
		response, err := console.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
		return response.StatusCode, time.Since(start)
	}
	binding := canonical("prod", http.MethodDelete, "/api/v1/topics/orders", nil, nil)

	status, cold := forward(policy.mint(binding, 30*time.Second))
	if status != http.StatusOK {
		t.Fatalf("cold request status %d", status)
	}
	var warm []time.Duration
	for i := 0; i < 200; i++ {
		status, elapsed := forward(policy.mint(binding, 30*time.Second))
		if status != http.StatusOK {
			t.Fatalf("warm request %d status %d", i, status)
		}
		warm = append(warm, elapsed)
	}
	sort.Slice(warm, func(i, j int) bool { return warm[i] < warm[j] })
	t.Logf("cold (two mTLS handshakes): %v; warm p50=%v p99=%v max=%v", cold.Round(time.Microsecond),
		warm[100].Round(time.Microsecond), warm[198].Round(time.Microsecond), warm[199].Round(time.Microsecond))

	before := kafkaCalls.Load()
	handle := policy.mint(binding, 30*time.Second)
	if status, _ := forward(handle); status != http.StatusOK {
		t.Fatalf("first use status %d", status)
	}
	if status, _ := forward(handle); status != http.StatusForbidden {
		t.Fatalf("replay status %d", status)
	}
	if status, _ := forward(policy.mint(canonical("prod", http.MethodDelete, "/api/v1/topics/payments", nil, nil), 30*time.Second)); status != http.StatusForbidden {
		t.Fatalf("wrong-target status %d", status)
	}
	expired := policy.mint(binding, time.Millisecond)
	time.Sleep(5 * time.Millisecond)
	if status, _ := forward(expired); status != http.StatusForbidden {
		t.Fatalf("expired status %d", status)
	}
	if status, _ := forward(""); status != http.StatusForbidden {
		t.Fatalf("missing delegation status %d", status)
	}
	policy.delay.Store(int64(1500 * time.Millisecond))
	slowStatus, slowElapsed := forward(policy.mint(binding, 30*time.Second))
	if slowStatus != http.StatusServiceUnavailable {
		t.Fatalf("slow policy status %d", slowStatus)
	}
	t.Logf("replay/wrong target/expired/missing: 403; slow policy (1.5 s) with 1 s Gateway budget: 503 after %v", slowElapsed.Round(time.Millisecond))
	if got := kafkaCalls.Load() - before; got != 1 {
		t.Fatalf("Kafka action ran %d times, want 1", got)
	}
	t.Log("Kafka action ran only for the single allowed request")
}

func bytesReader(b []byte) io.Reader { return &readerOnce{b: b} }

type readerOnce struct{ b []byte }

func (r *readerOnce) Read(p []byte) (int, error) {
	if len(r.b) == 0 {
		return 0, io.EOF
	}
	n := copy(p, r.b)
	r.b = r.b[n:]
	return n, nil
}
