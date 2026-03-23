package models

import (
	"database/sql"
	"fmt"
)

// SiteSettings holds the global configuration values.
type SiteSettings struct {
	SiteName         string
	RegistrationOpen bool
	SiteDescription  string
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
