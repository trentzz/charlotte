package api

import (
	"net/http"
	"regexp"
	"strings"
)

// validID matches a non-empty string of ASCII digits only.
// This prevents path traversal via the userID segment.
var validID = regexp.MustCompile(`^[0-9]+$`)

// ServeUpload serves an uploaded file from /uploads/{userID}/{filename}.
// Prevents path traversal by rejecting filenames containing ".." or "/"
// and userIDs that contain anything other than digits.
func (a *App) ServeUpload(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("userID")
	filename := r.PathValue("filename")

	if userIDStr == "" || filename == "" {
		http.NotFound(w, r)
		return
	}
	if !validID.MatchString(userIDStr) {
		http.NotFound(w, r)
		return
	}
	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, a.DataDir+"/uploads/"+userIDStr+"/"+filename)
}
