// Package storage handles file upload validation and storage.
package storage

import (
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/disintegration/imaging"
	_ "golang.org/x/image/webp"
)

const (
	// MaxUploadBytes is the maximum allowed file size for image uploads (30 MB).
	MaxUploadBytes = 30 << 20

	// CompressMaxEdge is the maximum pixel length of the long edge for compressed photos.
	CompressMaxEdge = 1920

	// CompressQuality is the JPEG quality used when saving compressed photos.
	CompressQuality = 80
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
	Filename           string
	MIMEType           string
	SizeBytes          int64
	Width              int
	Height             int
	CompressedFilename string
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

	result := &UploadResult{
		Filename:  filename,
		MIMEType:  mimeType,
		SizeBytes: written,
		Width:     img.Width,
		Height:    img.Height,
	}

	// Compress non-GIF uploads. Failures are non-fatal.
	if mimeType != "image/gif" {
		cf, err := CompressPhoto(dataDir, userID, filename)
		if err != nil {
			log.Printf("compress upload %s: %v", filename, err)
		} else {
			result.CompressedFilename = cf
		}
	}

	return result, nil
}

// DeleteUpload removes a stored file from dataDir/uploads/{userID}/{filename}.
// It also removes the compressed version if one exists.
func DeleteUpload(dataDir string, userID int64, filename string) error {
	// Validate filename to prevent path traversal.
	if strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		return fmt.Errorf("invalid filename: %s", filename)
	}
	dir := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10))
	path := filepath.Join(dir, filename)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete upload: %w", err)
	}
	// Remove the compressed version; ignore not-found.
	cf := compressedFilename(filename)
	_ = os.Remove(filepath.Join(dir, cf))
	return nil
}

// compressedFilename returns the filename used for the compressed JPEG copy.
// e.g. "abc123.png" -> "abc123_c.jpg"
func compressedFilename(original string) string {
	ext := filepath.Ext(original)
	base := strings.TrimSuffix(original, ext)
	return base + "_c.jpg"
}

// CompressPhoto creates a compressed JPEG version of an already-saved original.
// It applies EXIF auto-orientation so the output is always upright.
func CompressPhoto(dataDir string, userID int64, originalFilename string) (string, error) {
	if strings.HasSuffix(strings.ToLower(originalFilename), ".gif") {
		return "", nil
	}
	origPath := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10), originalFilename)

	img, err := imaging.Open(origPath, imaging.AutoOrientation(true))
	if err != nil {
		return "", fmt.Errorf("open image: %w", err)
	}

	// Resize to fit within CompressMaxEdge x CompressMaxEdge, preserving aspect ratio.
	b := img.Bounds()
	if b.Dx() > CompressMaxEdge || b.Dy() > CompressMaxEdge {
		img = imaging.Fit(img, CompressMaxEdge, CompressMaxEdge, imaging.Lanczos)
	}

	cf := compressedFilename(originalFilename)
	destPath := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10), cf)
	if err := imaging.Save(img, destPath, imaging.JPEGQuality(CompressQuality)); err != nil {
		return "", fmt.Errorf("save compressed: %w", err)
	}
	return cf, nil
}

// RotatePhoto rotates both the original and compressed files by the given degrees (90 or -90).
// Positive degrees = clockwise, negative = counter-clockwise.
func RotatePhoto(dataDir string, userID int64, originalFilename, compressedFilename string, degrees int) error {
	dir := filepath.Join(dataDir, "uploads", strconv.FormatInt(userID, 10))
	rotate := func(path string) error {
		img, err := imaging.Open(path, imaging.AutoOrientation(true))
		if err != nil {
			return err
		}
		switch degrees {
		case 90:
			img = imaging.Rotate270(img) // Rotate270 = 90° CW
		case -90:
			img = imaging.Rotate90(img) // Rotate90 = 90° CCW
		case 180:
			img = imaging.Rotate180(img)
		default:
			return fmt.Errorf("unsupported rotation: %d", degrees)
		}
		return imaging.Save(img, path, imaging.JPEGQuality(CompressQuality))
	}

	if err := rotate(filepath.Join(dir, originalFilename)); err != nil {
		return fmt.Errorf("rotate original: %w", err)
	}
	if compressedFilename != "" {
		if err := rotate(filepath.Join(dir, compressedFilename)); err != nil {
			return fmt.Errorf("rotate compressed: %w", err)
		}
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
