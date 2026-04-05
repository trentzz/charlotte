package models

// KindDef describes one custom page type.
type KindDef struct {
	Kind        string      `json:"kind"`
	Format      string      `json:"format"` // "freeform" | "list" | "structured"
	Label       string      `json:"label"`  // display name, e.g. "Books read"
	DefaultSlug string      `json:"default_slug"`
	Description string      `json:"description"` // shown on the add-page picker
	ListColumns []ColumnDef `json:"list_columns,omitempty"`
}

// ColumnDef describes one column in a list-format page.
type ColumnDef struct {
	Key      string   `json:"key"`
	Label    string   `json:"label"`
	Type     string   `json:"type"`              // "text" | "number" | "date" | "select" | "textarea"
	Options  []string `json:"options,omitempty"` // for "select" type
	Required bool     `json:"required,omitempty"`
}

// Kinds is the registry of all supported custom page kinds.
var Kinds = []KindDef{
	{
		Kind: "now", Format: "freeform", Label: "Now page",
		DefaultSlug: "now", Description: "What you're currently reading, working on, and listening to.",
	},
	{
		Kind: "uses", Format: "freeform", Label: "Uses / Gear",
		DefaultSlug: "uses", Description: "Tools, hardware, and software you use.",
	},
	{
		Kind: "faq", Format: "structured", Label: "FAQ",
		DefaultSlug: "faq", Description: "Frequently asked questions.",
	},
	{
		Kind: "books", Format: "list", Label: "Books",
		DefaultSlug: "books", Description: "Books you've read, with ratings and reviews.",
		ListColumns: []ColumnDef{
			{Key: "author",    Label: "Author",    Type: "text"},
			{Key: "year",      Label: "Year",      Type: "number"},
			{Key: "genre",     Label: "Genre",     Type: "text"},
			{Key: "review",    Label: "Review",    Type: "textarea"},
			{Key: "date_read", Label: "Date read", Type: "date"},
		},
	},
	{
		Kind: "movies", Format: "list", Label: "Movies",
		DefaultSlug: "movies", Description: "Movies you've watched, with ratings and reviews.",
		ListColumns: []ColumnDef{
			{Key: "director",     Label: "Director",     Type: "text"},
			{Key: "year",         Label: "Year",         Type: "number"},
			{Key: "review",       Label: "Review",       Type: "textarea"},
			{Key: "date_watched", Label: "Date watched", Type: "date"},
		},
	},
	{
		Kind: "games", Format: "list", Label: "Games",
		DefaultSlug: "games", Description: "Games you've played.",
		ListColumns: []ColumnDef{
			{Key: "platform",    Label: "Platform",    Type: "text"},
			{Key: "year",        Label: "Year",        Type: "number"},
			{Key: "review",      Label: "Review",      Type: "textarea"},
			{Key: "date_played", Label: "Date played", Type: "date"},
		},
	},
	{
		Kind: "travel", Format: "list", Label: "Travel",
		DefaultSlug: "travel", Description: "Places you've visited.",
		ListColumns: []ColumnDef{
			{Key: "country", Label: "Country", Type: "text"},
			{Key: "year",    Label: "Year",    Type: "number"},
			{Key: "notes",   Label: "Notes",   Type: "textarea"},
		},
	},
	{
		Kind: "bucketlist", Format: "list", Label: "Bucket list",
		DefaultSlug: "bucket-list", Description: "Things you want to do.",
		ListColumns: []ColumnDef{
			{Key: "notes", Label: "Notes", Type: "textarea"},
		},
	},
	{
		Kind: "resume", Format: "structured", Label: "Résumé / CV",
		DefaultSlug: "resume", Description: "Work history, education, and skills.",
	},
	{
		Kind: "event", Format: "structured", Label: "Event / Wedding",
		DefaultSlug: "event", Description: "A special occasion — wedding, graduation, milestone.",
	},
}

// KindByName returns the KindDef for a given kind string.
func KindByName(kind string) (KindDef, bool) {
	for _, k := range Kinds {
		if k.Kind == kind {
			return k, true
		}
	}
	return KindDef{}, false
}
