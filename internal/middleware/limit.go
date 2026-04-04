package middleware

import "net/http"

// LimitBody returns middleware that caps the request body to limit bytes.
// This prevents oversized JSON payloads from exhausting server memory.
// Multipart requests (file uploads) should use their own per-handler limits.
func LimitBody(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}
