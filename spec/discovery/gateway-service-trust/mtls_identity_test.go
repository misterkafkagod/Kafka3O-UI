// Throwaway discovery prototype: mutual TLS between Console and Gateway with URI-SAN service identities.
package gatewayservicetrust

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"errors"
	"io"
	"math/big"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"
)

type issued struct {
	cert *x509.Certificate
	key  *ecdsa.PrivateKey
}

func issue(t *testing.T, parent *issued, cn string, uri string, isCA bool, usage []x509.ExtKeyUsage, notAfter time.Time, dns ...string) *issued {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	serial, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	template := &x509.Certificate{
		SerialNumber: serial, Subject: pkix.Name{CommonName: cn},
		NotBefore: time.Now().Add(-time.Minute), NotAfter: notAfter,
		KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: usage, DNSNames: dns,
		BasicConstraintsValid: true, IsCA: isCA,
	}
	if isCA {
		template.KeyUsage |= x509.KeyUsageCertSign
	}
	if uri != "" {
		parsed, _ := url.Parse(uri)
		template.URIs = []*url.URL{parsed}
	}
	signer, signerKey := template, key
	if parent != nil {
		signer, signerKey = parent.cert, parent.key
	}
	der, err := x509.CreateCertificate(rand.Reader, template, signer, &key.PublicKey, signerKey)
	if err != nil {
		t.Fatal(err)
	}
	cert, _ := x509.ParseCertificate(der)
	return &issued{cert: cert, key: key}
}

func (i *issued) tls() tls.Certificate {
	return tls.Certificate{Certificate: [][]byte{i.cert.Raw}, PrivateKey: i.key, Leaf: i.cert}
}

// requirePeerURI accepts only a verified client chain whose leaf has exactly one URI SAN equal to want.
func requirePeerURI(want string) func([][]byte, [][]*x509.Certificate) error {
	return func(_ [][]byte, chains [][]*x509.Certificate) error {
		if len(chains) == 0 || len(chains[0][0].URIs) != 1 || chains[0][0].URIs[0].String() != want {
			return errors.New("unexpected service identity")
		}
		return nil
	}
}

func TestMutualTLSServiceIdentity(t *testing.T) {
	ca := issue(t, nil, "Kafka3O service CA", "", true, nil, time.Now().Add(time.Hour))
	other := issue(t, nil, "Other CA", "", true, nil, time.Now().Add(time.Hour))
	server := issue(t, ca, "gateway-prod", "spiffe://kafka3o/gateway/prod", false, []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, time.Now().Add(time.Hour), "127.0.0.1", "localhost")
	server.cert.IPAddresses = nil
	pool := x509.NewCertPool()
	pool.AddCert(ca.cert)

	gateway := httptest.NewUnstartedServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, r.TLS.PeerCertificates[0].URIs[0].String())
	}))
	gateway.TLS = &tls.Config{
		MinVersion: tls.VersionTLS13, Certificates: []tls.Certificate{server.tls()},
		ClientAuth: tls.RequireAndVerifyClientCert, ClientCAs: pool,
		VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/console"),
	}
	gateway.StartTLS()
	defer gateway.Close()

	client := func(cert *issued) *http.Client {
		config := &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: pool, ServerName: "localhost",
			VerifyPeerCertificate: requirePeerURI("spiffe://kafka3o/gateway/prod")}
		if cert != nil {
			config.Certificates = []tls.Certificate{cert.tls()}
		}
		return &http.Client{Transport: &http.Transport{TLSClientConfig: config}, Timeout: 2 * time.Second}
	}
	clientUsage := []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}
	cases := []struct {
		name string
		cert *issued
		ok   bool
	}{
		{"console identity", issue(t, ca, "console", "spiffe://kafka3o/console", false, clientUsage, time.Now().Add(time.Hour)), true},
		{"no client certificate", nil, false},
		{"untrusted CA", issue(t, other, "console", "spiffe://kafka3o/console", false, clientUsage, time.Now().Add(time.Hour)), false},
		{"other service identity", issue(t, ca, "gateway-dev", "spiffe://kafka3o/gateway/dev", false, clientUsage, time.Now().Add(time.Hour)), false},
		{"expired", issue(t, ca, "console", "spiffe://kafka3o/console", false, clientUsage, time.Now().Add(-time.Second)), false},
		{"server-auth only usage", issue(t, ca, "console", "spiffe://kafka3o/console", false, []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth}, time.Now().Add(time.Hour)), false},
	}
	for _, tt := range cases {
		response, err := client(tt.cert).Get(gateway.URL)
		if tt.ok {
			if err != nil {
				t.Fatalf("%s: %v", tt.name, err)
			}
			body, _ := io.ReadAll(response.Body)
			response.Body.Close()
			t.Logf("%s: accepted as %s", tt.name, body)
			continue
		}
		if err == nil {
			response.Body.Close()
			t.Fatalf("%s was accepted", tt.name)
		}
		t.Logf("%s: rejected (%v)", tt.name, err)
	}
}
