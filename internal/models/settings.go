package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

// SiteSettings holds the global configuration values.
type SiteSettings struct {
	SiteName         string
	RegistrationOpen bool
	SiteDescription  string
	SiteThemeJSON    string
}

// GetSiteSettings reads all settings from the database.
func GetSiteSettings(db *sql.DB) (*SiteSettings, error) {
	rows, err := db.Query(`SELECT key, value FROM site_settings`)
	if err != nil {
		return nil, fmt.Errorf("get site settings: %w", err)
	}
	defer rows.Close()

	s := &SiteSettings{
		SiteName:         "Charlotte",
		RegistrationOpen: true,
	}
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		switch k {
		case "site_name":
			s.SiteName = v
		case "registration_open":
			s.RegistrationOpen = v == "true"
		case "site_description":
			s.SiteDescription = v
		case "site_theme_json":
			s.SiteThemeJSON = v
		}
	}
	return s, rows.Err()
}

// SetSiteSetting upserts a single setting key/value pair.
func SetSiteSetting(db *sql.DB, key, value string) error {
	_, err := db.Exec(
		`INSERT INTO site_settings (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value,
	)
	return err
}

// DefaultSiteTheme returns the site-wide default colour scheme.
func DefaultSiteTheme() UserTheme {
	return UserTheme{
		AccentH:      340,
		AccentS:      50,
		AccentL:      35,
		BgH:          38,
		BgS:          30,
		BgL:          97,
		TextH:        220,
		TextS:        20,
		TextL:        15,
		HeadingH:     220,
		HeadingS:     25,
		HeadingL:     10,
		DarkAccentH:  36,
		DarkAccentS:  70,
		DarkAccentL:  58,
		DarkBgH:      222,
		DarkBgS:      22,
		DarkBgL:      11,
		DarkTextH:    36,
		DarkTextS:    15,
		DarkTextL:    88,
		DarkHeadingH: 36,
		DarkHeadingS: 20,
		DarkHeadingL: 95,
		FontDisplay:  "Playfair Display",
		FontBody:     "Playfair Display",
		FontUI:       "Inter",
		FontSize:     16,
		NavFontSize:  13,
	}
}

// GetSiteTheme returns the stored site theme, falling back to DefaultSiteTheme.
func GetSiteTheme(db *sql.DB) (UserTheme, error) {
	var v string
	err := db.QueryRow(`SELECT value FROM site_settings WHERE key = 'site_theme_json'`).Scan(&v)
	if err != nil && err != sql.ErrNoRows {
		return DefaultSiteTheme(), fmt.Errorf("get site theme: %w", err)
	}
	theme := DefaultSiteTheme()
	if v != "" {
		_ = json.Unmarshal([]byte(v), &theme)
	}
	return theme, nil
}

// SaveSiteTheme persists t as the site-wide theme.
func SaveSiteTheme(db *sql.DB, t UserTheme) error {
	b, err := json.Marshal(t)
	if err != nil {
		return err
	}
	return SetSiteSetting(db, "site_theme_json", string(b))
}

// SaveSiteSettings writes all fields of s back to the database.
func SaveSiteSettings(db *sql.DB, s *SiteSettings) error {
	regOpen := "false"
	if s.RegistrationOpen {
		regOpen = "true"
	}
	for k, v := range map[string]string{
		"site_name":         s.SiteName,
		"registration_open": regOpen,
		"site_description":  s.SiteDescription,
	} {
		if err := SetSiteSetting(db, k, v); err != nil {
			return err
		}
	}
	return nil
}
