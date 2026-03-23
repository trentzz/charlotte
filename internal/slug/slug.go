// Package slug generates URL-safe slugs from arbitrary strings.
package slug

import (
	"regexp"
	"strings"
	"unicode"
)

var (
	reNonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)
)

// Make converts s into a lowercase, hyphen-separated slug.
func Make(s string) string {
	// Normalise to ASCII by replacing non-ASCII characters with their approximate equivalents.
	var sb strings.Builder
	for _, r := range s {
		if r < 128 {
			sb.WriteRune(unicode.ToLower(r))
		} else {
			sb.WriteRune('-')
		}
	}
	result := sb.String()
	result = reNonAlphanumeric.ReplaceAllString(result, "-")
	result = strings.Trim(result, "-")
	if result == "" {
		result = "untitled"
	}
	return result
}
