// Package tmpl provides template rendering helpers.
package tmpl

import (
	"fmt"
	"html/template"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

// Renderer holds a set of pre-parsed templates.
type Renderer struct {
	base      string
	templates map[string]*template.Template
}

// funcMap defines the template functions available to all templates.
var funcMap = template.FuncMap{
	"formatDate": func(t time.Time) string {
		return t.Format("2 January 2006")
	},
	"formatDateTime": func(t time.Time) string {
		return t.Format("2 January 2006, 15:04")
	},
	"joinStrings": func(s []string, sep string) string {
		return strings.Join(s, sep)
	},
	"safeHTML": func(s string) template.HTML {
		return template.HTML(s) //nolint:gosec // content is sanitised before storage
	},
	"string": func(v interface{}) string {
		return fmt.Sprintf("%s", v)
	},
	"firstChar": func(s string) string {
		if len(s) == 0 {
			return "?"
		}
		for _, r := range s {
			return string(r)
		}
		return "?"
	},
	"add": func(a, b int) int { return a + b },
	"sub": func(a, b int) int { return a - b },
	"bytesToMB": func(n int64) string {
		if n < 1024 {
			return fmt.Sprintf("%d B", n)
		}
		if n < 1024*1024 {
			return fmt.Sprintf("%.1f KB", float64(n)/1024)
		}
		return fmt.Sprintf("%.1f MB", float64(n)/(1024*1024))
	},
}

// New parses all templates from the given base directory.
// Templates are expected under base/templates/.
// Each page template is parsed together with base.html.
func New(baseDir string) (*Renderer, error) {
	r := &Renderer{
		base:      baseDir,
		templates: make(map[string]*template.Template),
	}

	baseTemplate := filepath.Join(baseDir, "templates", "base.html")

	pages := []string{
		"landing",
		"error",
		"auth/login",
		"auth/register",
		"user/home",
		"user/blog_index",
		"user/blog_post",
		"user/about",
		"user/gallery_home",
		"user/gallery_album",
		"user/recipe_index",
		"user/recipe_post",
		"dashboard/home",
		"dashboard/profile",
		"dashboard/blog",
		"dashboard/about",
		"dashboard/gallery",
		"dashboard/gallery_album",
		"dashboard/recipes",
		"admin/home",
		"admin/users",
		"admin/content",
		"admin/settings",
	}

	for _, page := range pages {
		pagePath := filepath.Join(baseDir, "templates", page+".html")
		t, err := template.New(filepath.Base(pagePath)).Funcs(funcMap).ParseFiles(baseTemplate, pagePath)
		if err != nil {
			return nil, fmt.Errorf("parse template %s: %w", page, err)
		}
		r.templates[page] = t
	}

	return r, nil
}

// Render executes the named template with data, writing to w.
// On error it writes a plain 500 response.
func (r *Renderer) Render(w http.ResponseWriter, status int, name string, data any) {
	t, ok := r.templates[name]
	if !ok {
		http.Error(w, fmt.Sprintf("template %q not found", name), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	if err := t.ExecuteTemplate(w, "base", data); err != nil {
		// Headers already sent; log and do nothing more.
		fmt.Printf("template execute error (%s): %v\n", name, err)
	}
}
