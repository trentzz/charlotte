package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/trentzz/charlotte/internal/middleware"
	"github.com/trentzz/charlotte/internal/models"
	"github.com/trentzz/charlotte/internal/slug"
)

// DashCustomPageList handles GET /api/v1/dashboard/custom-pages.
func (a *App) DashCustomPageList(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	pages, err := models.ListCustomPagesByUser(a.DB, user.ID, false)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{
		"pages": toCustomPageList(pages),
		"nav": map[string]any{
			"mode":  user.CustomNavMode,
			"label": user.CustomNavGroupLabel,
		},
	})
}

// DashCustomPageKinds handles GET /api/v1/dashboard/custom-pages/kinds.
func (a *App) DashCustomPageKinds(w http.ResponseWriter, r *http.Request) {
	a.respondJSON(w, http.StatusOK, map[string]any{"kinds": models.Kinds})
}

// DashCustomPageCreate handles POST /api/v1/dashboard/custom-pages.
func (a *App) DashCustomPageCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	var body struct {
		Kind  string `json:"kind"`
		Title string `json:"title"`
		Slug  string `json:"slug"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	kd, ok := models.KindByName(body.Kind)
	if !ok {
		a.respondError(w, http.StatusBadRequest, "unknown kind")
		return
	}
	pageSlug := body.Slug
	if pageSlug == "" {
		pageSlug = kd.DefaultSlug
	}
	pageSlug = slug.Make(pageSlug)
	if pageSlug == "" {
		a.respondError(w, http.StatusBadRequest, "invalid slug")
		return
	}
	title := body.Title
	if title == "" {
		title = kd.Label
	}
	p := &models.CustomPage{
		UserID:   user.ID,
		Kind:     kd.Kind,
		Format:   kd.Format,
		Slug:     pageSlug,
		Title:    title,
		DataJSON: "{}",
	}
	id, err := models.CreateCustomPage(a.DB, p)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	p.ID = id
	a.respondJSON(w, http.StatusCreated, map[string]any{"page": toCustomPageJSON(p)})
}

// DashCustomPageGet handles GET /api/v1/dashboard/custom-pages/{id}.
func (a *App) DashCustomPageGet(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	p, err := models.GetCustomPageByID(a.DB, id)
	if err != nil || p.UserID != user.ID {
		a.respondError(w, http.StatusNotFound, "not found")
		return
	}
	entries, _ := models.ListEntriesByPage(a.DB, p.ID)
	kd, _ := models.KindByName(p.Kind)
	a.respondJSON(w, http.StatusOK, map[string]any{
		"page":     toCustomPageJSON(p),
		"entries":  toEntryList(entries),
		"kind_def": kd,
	})
}

// DashCustomPageUpdate handles PUT /api/v1/dashboard/custom-pages/{id}.
func (a *App) DashCustomPageUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	p, err := models.GetCustomPageByID(a.DB, id)
	if err != nil || p.UserID != user.ID {
		a.respondError(w, http.StatusNotFound, "not found")
		return
	}
	var body struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Slug        string `json:"slug"`
		Body        string `json:"body"`
		DataJSON    string `json:"data_json"`
		NavPinned   *bool  `json:"nav_pinned"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if body.Title != "" {
		p.Title = body.Title
	}
	if body.Slug != "" {
		p.Slug = slug.Make(body.Slug)
	}
	p.Description = body.Description
	p.Body = body.Body
	if body.DataJSON != "" {
		p.DataJSON = body.DataJSON
	}
	if body.NavPinned != nil {
		p.NavPinned = *body.NavPinned
	}
	if err := models.UpdateCustomPage(a.DB, p); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"page": toCustomPageJSON(p)})
}

// DashCustomPageToggle handles PATCH /api/v1/dashboard/custom-pages/{id}/toggle.
func (a *App) DashCustomPageToggle(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	if err := models.ToggleCustomPagePublished(a.DB, id, user.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	p, _ := models.GetCustomPageByID(a.DB, id)
	a.respondJSON(w, http.StatusOK, map[string]any{"page": toCustomPageJSON(p)})
}

// DashCustomPageDelete handles DELETE /api/v1/dashboard/custom-pages/{id}.
func (a *App) DashCustomPageDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	if err := models.DeleteCustomPage(a.DB, id, user.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DashCustomNav handles PUT /api/v1/dashboard/custom-pages/nav.
func (a *App) DashCustomNav(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	var body struct {
		Mode  string `json:"mode"`
		Label string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := models.UpdateUserCustomNav(a.DB, user.ID, body.Mode, body.Label); err != nil {
		a.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// DashEntryCreate handles POST /api/v1/dashboard/custom-pages/{id}/entries.
func (a *App) DashEntryCreate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	pageID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	p, err := models.GetCustomPageByID(a.DB, pageID)
	if err != nil || p.UserID != user.ID {
		a.respondError(w, http.StatusNotFound, "not found")
		return
	}
	var body struct {
		Title      string  `json:"title"`
		Subtitle   string  `json:"subtitle"`
		Rating     int     `json:"rating"`
		Status     string  `json:"status"`
		EntryDate  *string `json:"entry_date"` // "YYYY-MM-DD" or null
		FieldsJSON string  `json:"fields_json"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	e := &models.CustomPageEntry{
		PageID:     pageID,
		UserID:     user.ID,
		Title:      body.Title,
		Subtitle:   body.Subtitle,
		Rating:     body.Rating,
		Status:     body.Status,
		FieldsJSON: body.FieldsJSON,
	}
	if e.FieldsJSON == "" {
		e.FieldsJSON = "{}"
	}
	if body.EntryDate != nil && *body.EntryDate != "" {
		t, err := parseDate(*body.EntryDate)
		if err == nil {
			e.EntryDate = &t
		}
	}
	id, err := models.CreateEntry(a.DB, e)
	if err != nil {
		a.internalError(w, r, err)
		return
	}
	e.ID = id
	a.respondJSON(w, http.StatusCreated, map[string]any{"entry": toEntryJSON(e)})
}

// DashEntryUpdate handles PUT /api/v1/dashboard/custom-pages/{id}/entries/{eid}.
func (a *App) DashEntryUpdate(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	eid, err := strconv.ParseInt(r.PathValue("eid"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	e, err := models.GetEntryByID(a.DB, eid)
	if err != nil || e.UserID != user.ID {
		a.respondError(w, http.StatusNotFound, "not found")
		return
	}
	var body struct {
		Title      string  `json:"title"`
		Subtitle   string  `json:"subtitle"`
		Rating     int     `json:"rating"`
		Status     string  `json:"status"`
		EntryDate  *string `json:"entry_date"`
		FieldsJSON string  `json:"fields_json"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		a.respondError(w, http.StatusBadRequest, "invalid body")
		return
	}
	e.Title = body.Title
	e.Subtitle = body.Subtitle
	e.Rating = body.Rating
	e.Status = body.Status
	if body.FieldsJSON != "" {
		e.FieldsJSON = body.FieldsJSON
	}
	e.EntryDate = nil
	if body.EntryDate != nil && *body.EntryDate != "" {
		t, err := parseDate(*body.EntryDate)
		if err == nil {
			e.EntryDate = &t
		}
	}
	if err := models.UpdateEntry(a.DB, e); err != nil {
		a.internalError(w, r, err)
		return
	}
	a.respondJSON(w, http.StatusOK, map[string]any{"entry": toEntryJSON(e)})
}

// DashEntryDelete handles DELETE /api/v1/dashboard/custom-pages/{id}/entries/{eid}.
func (a *App) DashEntryDelete(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	eid, err := strconv.ParseInt(r.PathValue("eid"), 10, 64)
	if err != nil {
		a.respondError(w, http.StatusBadRequest, "bad id")
		return
	}
	if err := models.DeleteEntry(a.DB, eid, user.ID); err != nil {
		a.internalError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ── JSON helpers ──────────────────────────────────────────────────────────────

type customPageJSON struct {
	ID          int64  `json:"id"`
	Kind        string `json:"kind"`
	Format      string `json:"format"`
	Slug        string `json:"slug"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Body        string `json:"body"`
	DataJSON    string `json:"data_json"`
	Published   bool   `json:"published"`
	NavPinned   bool   `json:"nav_pinned"`
	SortOrder   int    `json:"sort_order"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

func toCustomPageJSON(p *models.CustomPage) customPageJSON {
	return customPageJSON{
		ID:          p.ID,
		Kind:        p.Kind,
		Format:      p.Format,
		Slug:        p.Slug,
		Title:       p.Title,
		Description: p.Description,
		Body:        p.Body,
		DataJSON:    p.DataJSON,
		Published:   p.Published,
		NavPinned:   p.NavPinned,
		SortOrder:   p.SortOrder,
		CreatedAt:   p.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:   p.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

func toCustomPageList(pages []*models.CustomPage) []customPageJSON {
	out := make([]customPageJSON, 0, len(pages))
	for _, p := range pages {
		out = append(out, toCustomPageJSON(p))
	}
	return out
}

type entryJSON struct {
	ID         int64   `json:"id"`
	PageID     int64   `json:"page_id"`
	Title      string  `json:"title"`
	Subtitle   string  `json:"subtitle"`
	Rating     int     `json:"rating"`
	Status     string  `json:"status"`
	EntryDate  *string `json:"entry_date"`
	FieldsJSON string  `json:"fields_json"`
	SortOrder  int     `json:"sort_order"`
	CreatedAt  string  `json:"created_at"`
}

func toEntryJSON(e *models.CustomPageEntry) entryJSON {
	j := entryJSON{
		ID:         e.ID,
		PageID:     e.PageID,
		Title:      e.Title,
		Subtitle:   e.Subtitle,
		Rating:     e.Rating,
		Status:     e.Status,
		FieldsJSON: e.FieldsJSON,
		SortOrder:  e.SortOrder,
		CreatedAt:  e.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
	if e.EntryDate != nil {
		s := e.EntryDate.Format("2006-01-02")
		j.EntryDate = &s
	}
	return j
}

func toEntryList(entries []*models.CustomPageEntry) []entryJSON {
	out := make([]entryJSON, 0, len(entries))
	for _, e := range entries {
		out = append(out, toEntryJSON(e))
	}
	return out
}

// parseDate parses a YYYY-MM-DD date string.
func parseDate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}
