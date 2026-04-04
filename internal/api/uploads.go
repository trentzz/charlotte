package api

import (
	"net/http"
	"strings"
)

// ServeUpload serves an uploaded file from /uploads/{userID}/{filename}.
// Prevents path traversal by rejecting filenames containing ".." or "/".
func (a *App) ServeUpload(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("userID")
	filename := r.PathValue("filename")

	if strings.Contains(filename, "..") || strings.Contains(filename, "/") {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if userIDStr == "" || filename == "" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}

	http.ServeFile(w, r, a.DataDir+"/uploads/"+userIDStr+"/"+filename)
}
