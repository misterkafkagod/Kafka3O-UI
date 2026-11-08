// Throwaway discovery prototype: binding a delegation to the exact Gateway request.
package gatewayservicetrust

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// canonical is the proposed v1 request binding: cluster, method, escaped path, sorted query and body digest.
func canonical(clusterID, method, escapedPath string, query url.Values, body []byte) [32]byte {
	bodyDigest := sha256.Sum256(body)
	return sha256.Sum256([]byte(strings.Join([]string{
		"kafka3o-delegation-v1", clusterID, method, escapedPath, query.Encode(), hex.EncodeToString(bodyDigest[:]),
	}, "\n")))
}

func TestCanonicalRequestSurvivesTransportAndDetectsTampering(t *testing.T) {
	var received [32]byte
	gateway := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		received = canonical("prod", r.Method, r.URL.EscapedPath(), r.URL.Query(), body)
	}))
	defer gateway.Close()
	send := func(method, path string, query url.Values, rawQuery string, body []byte) {
		t.Helper()
		target := gateway.URL + path
		if rawQuery != "" {
			target += "?" + rawQuery
		} else if len(query) > 0 {
			target += "?" + query.Encode()
		}
		request, _ := http.NewRequest(method, target, bytes.NewReader(body))
		response, err := http.DefaultClient.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		response.Body.Close()
	}
	search := url.Values{"query": {"order id=42 & café +1"}, "limit": {"50"}, "partition": {"0"}}
	cases := []struct {
		name        string
		method      string
		path        string
		query       url.Values
		rawQuery    string
		body        []byte
		boundMethod string
		boundPath   string
		boundQuery  url.Values
		boundBody   []byte
		match       bool
	}{
		{"search with spaces, unicode, & and +", "GET", "/api/v1/topics/orders.eu_1/messages/search", search, "", nil, "GET", "/api/v1/topics/orders.eu_1/messages/search", search, nil, true},
		{"proxy reorders query parameters", "GET", "/api/v1/topics/orders/messages", nil, "position=latest&limit=20", nil, "GET", "/api/v1/topics/orders/messages", url.Values{"limit": {"20"}, "position": {"latest"}}, nil, true},
		{"produce JSON body", "POST", "/api/v1/topics/orders/messages", nil, "", []byte(`{"key":"k","value":"v"}`), "POST", "/api/v1/topics/orders/messages", nil, []byte(`{"key":"k","value":"v"}`), true},
		{"body changed", "POST", "/api/v1/topics/orders/messages", nil, "", []byte(`{"key":"k","value":"evil"}`), "POST", "/api/v1/topics/orders/messages", nil, []byte(`{"key":"k","value":"v"}`), false},
		{"body re-serialized with spaces", "POST", "/api/v1/topics/orders/messages", nil, "", []byte(`{"key": "k", "value": "v"}`), "POST", "/api/v1/topics/orders/messages", nil, []byte(`{"key":"k","value":"v"}`), false},
		{"different topic", "DELETE", "/api/v1/topics/payments", nil, "", nil, "DELETE", "/api/v1/topics/orders", nil, nil, false},
		{"method changed", "DELETE", "/api/v1/topics/orders", nil, "", nil, "GET", "/api/v1/topics/orders", nil, nil, false},
		{"extra query parameter", "GET", "/api/v1/topics/orders/messages", nil, "limit=20&admin=true", nil, "GET", "/api/v1/topics/orders/messages", url.Values{"limit": {"20"}}, nil, false},
		{"empty body equals no body", "DELETE", "/api/v1/topics/orders", nil, "", []byte{}, "DELETE", "/api/v1/topics/orders", nil, nil, true},
	}
	for _, tt := range cases {
		send(tt.method, tt.path, tt.query, tt.rawQuery, tt.body)
		bound := canonical("prod", tt.boundMethod, tt.boundPath, tt.boundQuery, tt.boundBody)
		if (received == bound) != tt.match {
			t.Fatalf("%s: match=%t, want %t", tt.name, received == bound, tt.match)
		}
		t.Logf("%s: match=%t", tt.name, tt.match)
	}
	if canonical("prod", "GET", "/api/v1/topics", nil, nil) == canonical("dev", "GET", "/api/v1/topics", nil, nil) {
		t.Fatal("cluster ID is not bound")
	}
	if (url.Values{"a": {"1", "2"}}).Encode() == (url.Values{"a": {"2", "1"}}).Encode() {
		t.Fatal("duplicate-key value order unexpectedly ignored")
	}
	t.Log("duplicate query keys keep value order; the Console must reject duplicate keys before binding")
}
