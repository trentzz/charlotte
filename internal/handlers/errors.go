package handlers

import (
	"fmt"
	"net/http"
)

type errorData struct {
	PageData
	Code    int
	Message string
}

// NotFound renders a 404 page.
func (a *App) NotFound(w http.ResponseWriter, r *http.Request) {
	data := errorData{
		PageData: a.newPage(r, "Not found"),
		Code:     http.StatusNotFound,
		Message:  "The page you are looking for does not exist.",
	}
	a.Tmpl.Render(w, http.StatusNotFound, "error", data)
}

// InternalError renders a 500 page and logs the error.
func (a *App) InternalError(w http.ResponseWriter, r *http.Request, err error) {
	fmt.Printf("internal error on %s: %v\n", r.URL.Path, err)
	data := errorData{
		PageData: a.newPage(r, "Server error"),
		Code:     http.StatusInternalServerError,
		Message:  "Something went wrong. Please try again.",
	}
	a.Tmpl.Render(w, http.StatusInternalServerError, "error", data)
}

// Forbidden renders a 403 page.
func (a *App) Forbidden(w http.ResponseWriter, r *http.Request) {
	data := errorData{
		PageData: a.newPage(r, "Forbidden"),
		Code:     http.StatusForbidden,
		Message:  "You do not have permission to access this page.",
	}
	a.Tmpl.Render(w, http.StatusForbidden, "error", data)
}
