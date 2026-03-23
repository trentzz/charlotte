// Package storage handles file upload validation and storage.
package storage

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

)

const (
	// MaxUploadBytes is the maximum allowed file size for image uploads (10 MB).
	MaxUploadBytes = 10 << 20
)

// allowedMIMETypes is the set of MIME types accepted for photo uploads.
var allowedMIMETypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
	"image/gif":  true,
}

// UploadResult contains metadata about a successfully saved upload.
type UploadResult struct {
	Filename  string
	MIMEType  string
	SizeBytes int64
	Width     int
	Height    int
}

// SaveUpload validates fh and writes it to dataDir/uploads/{userID}/{filename}.
// Returns an error if the MIME type is not in the allowlist or the file is too large.
func SaveUpload(dataDir string, userID int64, fh *multipart.FileHeader) (*UploadResult, error) {
	if fh.Size > MaxUploadBytes {
		return nil, fmt.Errorf("file too large: %d bytes (max %d)", fh.Size, MaxUploadBytes)
	}

	src, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("open upload: %w", err)
	}
	defer src.Close()

	// Sniff the MIME type from the first 512 bytes.
	header := make([]byte, 512)
	n, err := src.Read(header)
	if err != nil && err != io.EOF {
		return nil, fmt.Errorf("read header: %w", err)
	}
	mimeType := http.DetectContentType(header[:n])
	// Normalise: DetectContentType can return "image/jpeg; charset=..." style strings.
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		mimeType = strings.TrimSpace(mimeType[:idx])
	}
	if !allowedMIMETypes[mimeType] {
		return nil, fmt.Errorf("unsupported file type: %s", mimeType)
	}

	// Seek back to start to read the full file.
	if _, err := src.(io.Seeker).Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("seek: %w", err)
	}

	// Decode dimensions.
	img, _, err := image.DecodeConfig(src)
	if err != nil {
		// Non-fatal: store zeros if we can't decode dimensions.
		img = image.Config{}
	}
	if _, err := src.(io.Seeker).Seek(0, io.SeekStart); err != nil {
		return nil, fmt.Errorf("seek: %w", err)
	}

	// Build a unique filename.
	ext := extensionForMIME(mimeType)
	filename := strconv.FormatInt(time.Now().UnixNano(), 36) + ext

	destDir := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10))
	if err := os.MkdirAll(destDir, 0o750); err != nil {
		return nil, fmt.Errorf("create upload dir: %w", err)
	}

	dest, err := os.Create(filepath.Join(destDir, filename))
	if err != nil {
		return nil, fmt.Errorf("create dest file: %w", err)
	}
	defer dest.Close()

	written, err := io.Copy(dest, src)
	if err != nil {
		return nil, fmt.Errorf("write upload: %w", err)
	}

	return &UploadResult{
		Filename:  filename,
		MIMEType:  mimeType,
		SizeBytes: written,
		Width:     img.Width,
		Height:    img.Height,
	}, nil
}

// DeleteUpload removes a stored file from dataDir/uploads/{userID}/{filename}.
func DeleteUpload(dataDir string, userID int64, filename string) error {
	// Validate filename to prevent path traversal.
	if strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		return fmt.Errorf("invalid filename: %s", filename)
	}
	path := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10), filename)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete upload: %w", err)
	}
	return nil
}

func extensionForMIME(mimeType string) string {
	switch mimeType {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".bin"
	}
}
