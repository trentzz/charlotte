# Epic: Custom Pages

## Goal

Add user-configurable custom pages to Charlotte. Users enable pages from a
dashboard section, content is published to a public URL at
`/u/{username}/pages/{slug}`, and enabled pages appear in the public navbar
either as individual items or grouped under a user-named dropdown.

## Page types (MVP — Phase 1)

| Kind | Format | Notes |
|---|---|---|
| now | free-form | What I'm currently doing/reading/listening to |
| uses | free-form | Tools, hardware, software I use |
| faq | structured | Q&A list |
| books | list | Title, author, rating, review, date read |
| movies | list | Title, year, director, rating, review |
| games | list | Title, platform, status, rating |
| travel | list | Country/city, year, notes |
| bucketlist | list | Items with done/pending status |
| resume | structured | Work history, education, skills |
| event | structured | Wedding/graduation — names, date, venue |

## Nav modes

- `individual` — each enabled page is a top-level nav button
- `grouped` — all pages appear under one NavDropdown with user-chosen label

## URL structure

Public: `/u/{username}/pages/{slug}`
Dashboard: `/dashboard/custom-pages` and `/dashboard/custom-pages/:id`

## Phases

- Phase 1 (this epic): foundation, all formats, free-form + list + structured pages
- Phase 2: list engine polish (bulk import, sort/filter), more kinds
- Phase 3: structured page polish (resume print view, event photo gallery)

## Tasks

### Phase 1

- [x] CP-01: Migrations (custom_pages, custom_page_entries, user nav columns)
- [x] CP-02: Go models (custom_pages.go, custom_page_entries.go, kinds.go)
- [x] CP-03: Extend user model (custom_nav_mode, custom_nav_group_label)
- [x] CP-04: Dashboard API handlers (dash_custom_pages.go)
- [x] CP-05: Public API handler (custom_pages_public.go)
- [x] CP-06: Extend profile.go to return custom_pages + custom_nav
- [x] CP-07: Register all routes in main.go
- [x] CP-08: Dashboard list page (CustomPages.jsx)
- [x] CP-09: Dashboard editor (CustomPageEdit.jsx) — free-form + list + structured
- [x] CP-10: Public renderer (CustomPage.jsx + format variants)
- [x] CP-11: Nav integration in ProfileLayout.jsx (individual + grouped modes)
- [x] CP-12: Add Custom pages to SettingsLayout.jsx sidebar
- [x] CP-13: Wire routes in App.jsx
- [x] CP-14: Update FEATURES.md
