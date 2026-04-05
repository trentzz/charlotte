package models

import (
	"database/sql"
	"testing"

	"github.com/trentzz/charlotte/internal/testutil"
)

// mustCreateUser inserts a user with the given username and returns the ID.
func mustCreateUser(t *testing.T, db *sql.DB, username string) int64 {
	t.Helper()
	u := &User{
		Username:     username,
		Email:        username + "@example.com",
		PasswordHash: "hash",
		Role:         RoleUser,
		Status:       StatusActive,
	}
	id, err := CreateUser(db, u)
	if err != nil {
		t.Fatalf("mustCreateUser(%q): %v", username, err)
	}
	return id
}

func TestCreateUser_HappyPath(t *testing.T) {
	db := testutil.NewTestDB(t)
	id, err := CreateUser(db, &User{
		Username:     "alice",
		Email:        "alice@example.com",
		PasswordHash: "hash",
		Role:         RoleUser,
		Status:       StatusActive,
	})
	if err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	if id <= 0 {
		t.Fatalf("expected positive ID, got %d", id)
	}
}

func TestCreateUser_DuplicateUsername(t *testing.T) {
	db := testutil.NewTestDB(t)
	mustCreateUser(t, db, "alice")
	_, err := CreateUser(db, &User{
		Username:     "alice",
		Email:        "alice2@example.com",
		PasswordHash: "hash",
		Role:         RoleUser,
		Status:       StatusActive,
	})
	if err == nil {
		t.Fatal("expected error on duplicate username, got nil")
	}
}

func TestCreateUser_DuplicateEmail(t *testing.T) {
	db := testutil.NewTestDB(t)
	mustCreateUser(t, db, "alice")
	_, err := CreateUser(db, &User{
		Username:     "bob",
		Email:        "alice@example.com",
		PasswordHash: "hash",
		Role:         RoleUser,
		Status:       StatusActive,
	})
	if err == nil {
		t.Fatal("expected error on duplicate email, got nil")
	}
}

func TestCreateUser_BlankEmailAllowsMultiple(t *testing.T) {
	db := testutil.NewTestDB(t)
	// Two users with no email must not conflict on the UNIQUE constraint.
	_, err1 := CreateUser(db, &User{Username: "u1", PasswordHash: "h", Role: RoleUser, Status: StatusActive})
	_, err2 := CreateUser(db, &User{Username: "u2", PasswordHash: "h", Role: RoleUser, Status: StatusActive})
	if err1 != nil {
		t.Fatalf("first blank-email user: %v", err1)
	}
	if err2 != nil {
		t.Fatalf("second blank-email user: %v", err2)
	}
}

func TestGetUserByID(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	u, err := GetUserByID(db, id)
	if err != nil {
		t.Fatalf("GetUserByID: %v", err)
	}
	if u.Username != "alice" {
		t.Errorf("expected username alice, got %q", u.Username)
	}
}

func TestGetUserByID_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetUserByID(db, 9999)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetUserByUsername(t *testing.T) {
	db := testutil.NewTestDB(t)
	mustCreateUser(t, db, "alice")

	u, err := GetUserByUsername(db, "alice")
	if err != nil {
		t.Fatalf("GetUserByUsername: %v", err)
	}
	if u.Username != "alice" {
		t.Errorf("expected alice, got %q", u.Username)
	}
}

func TestGetUserByUsername_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetUserByUsername(db, "nobody")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestGetUserByEmail(t *testing.T) {
	db := testutil.NewTestDB(t)
	mustCreateUser(t, db, "alice")

	u, err := GetUserByEmail(db, "alice@example.com")
	if err != nil {
		t.Fatalf("GetUserByEmail: %v", err)
	}
	if u.Email != "alice@example.com" {
		t.Errorf("expected alice@example.com, got %q", u.Email)
	}
}

func TestGetUserByEmail_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	_, err := GetUserByEmail(db, "nobody@example.com")
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestUpdateUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	u, _ := GetUserByID(db, id)
	u.DisplayName = "Alice Wonderland"
	u.Bio = "Testing bio"
	u.Links = []UserLink{{Label: "Site", URL: "https://example.com"}}
	u.ShowOnHomepage = true

	if err := UpdateUser(db, u); err != nil {
		t.Fatalf("UpdateUser: %v", err)
	}

	updated, _ := GetUserByID(db, id)
	if updated.DisplayName != "Alice Wonderland" {
		t.Errorf("DisplayName: got %q, want %q", updated.DisplayName, "Alice Wonderland")
	}
	if updated.Bio != "Testing bio" {
		t.Errorf("Bio: got %q, want %q", updated.Bio, "Testing bio")
	}
	if !updated.ShowOnHomepage {
		t.Error("ShowOnHomepage should be true")
	}
	if len(updated.Links) != 1 || updated.Links[0].Label != "Site" {
		t.Errorf("Links: got %v", updated.Links)
	}
}

func TestUpdateUserFeatures(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := UpdateUserFeatures(db, id, true, true, false, true, false); err != nil {
		t.Fatalf("UpdateUserFeatures: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if !u.FeatureBlog {
		t.Error("FeatureBlog should be true")
	}
	if !u.FeatureAbout {
		t.Error("FeatureAbout should be true")
	}
	if u.FeatureGallery {
		t.Error("FeatureGallery should be false")
	}
	if !u.FeatureRecipes {
		t.Error("FeatureRecipes should be true")
	}
	if u.FeatureProjects {
		t.Error("FeatureProjects should be false")
	}
}

func TestUpdateUserStatus(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := UpdateUserStatus(db, id, StatusSuspended); err != nil {
		t.Fatalf("UpdateUserStatus: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.Status != StatusSuspended {
		t.Errorf("expected StatusSuspended, got %q", u.Status)
	}
}

func TestUpdateUserStatus_NotFound(t *testing.T) {
	db := testutil.NewTestDB(t)
	err := UpdateUserStatus(db, 9999, StatusActive)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows, got %v", err)
	}
}

func TestUpdateUserRole(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := UpdateUserRole(db, id, RoleAdmin); err != nil {
		t.Fatalf("UpdateUserRole: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.Role != RoleAdmin {
		t.Errorf("expected admin, got %q", u.Role)
	}
}

func TestDeleteUser(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := DeleteUser(db, id); err != nil {
		t.Fatalf("DeleteUser: %v", err)
	}

	_, err := GetUserByID(db, id)
	if err != sql.ErrNoRows {
		t.Fatalf("expected sql.ErrNoRows after delete, got %v", err)
	}
}

func TestListActiveUsers(t *testing.T) {
	db := testutil.NewTestDB(t)
	id1 := mustCreateUser(t, db, "alice")
	id2 := mustCreateUser(t, db, "bob")

	// Suspend bob — should not appear in active list.
	_ = UpdateUserStatus(db, id2, StatusSuspended)
	_ = id1

	users, err := ListActiveUsers(db)
	if err != nil {
		t.Fatalf("ListActiveUsers: %v", err)
	}
	for _, u := range users {
		if u.Username == "bob" {
			t.Error("suspended user bob should not appear in active list")
		}
	}
	found := false
	for _, u := range users {
		if u.Username == "alice" {
			found = true
		}
	}
	if !found {
		t.Error("active user alice missing from list")
	}
}

func TestSetEmailVerifyToken(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := SetEmailVerifyToken(db, id, "tok123"); err != nil {
		t.Fatalf("SetEmailVerifyToken: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.EmailVerifyToken != "tok123" {
		t.Errorf("token: got %q, want tok123", u.EmailVerifyToken)
	}
	if u.EmailVerified {
		t.Error("email should not be marked verified after setting token")
	}
}

func TestConfirmEmailVerified(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")
	_ = SetEmailVerifyToken(db, id, "tok123")

	if err := ConfirmEmailVerified(db, id); err != nil {
		t.Fatalf("ConfirmEmailVerified: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if !u.EmailVerified {
		t.Error("EmailVerified should be true")
	}
	if u.EmailVerifyToken != "" {
		t.Errorf("token should be cleared, got %q", u.EmailVerifyToken)
	}
}

func TestUpdateUserNavConfig(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")
	cfg := `{"items":[]}`

	if err := UpdateUserNavConfig(db, id, cfg); err != nil {
		t.Fatalf("UpdateUserNavConfig: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.NavConfig != cfg {
		t.Errorf("NavConfig: got %q, want %q", u.NavConfig, cfg)
	}
}

func TestUpdateUserCustomNav(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	if err := UpdateUserCustomNav(db, id, "individual", "Extra"); err != nil {
		t.Fatalf("UpdateUserCustomNav: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.CustomNavMode != "individual" {
		t.Errorf("CustomNavMode: got %q, want individual", u.CustomNavMode)
	}
	if u.CustomNavGroupLabel != "Extra" {
		t.Errorf("CustomNavGroupLabel: got %q, want Extra", u.CustomNavGroupLabel)
	}
}

func TestUpdateUserCustomNav_InvalidModeDefaultsToGrouped(t *testing.T) {
	db := testutil.NewTestDB(t)
	id := mustCreateUser(t, db, "alice")

	// An invalid mode should be silently coerced to "grouped".
	if err := UpdateUserCustomNav(db, id, "invalid", "Label"); err != nil {
		t.Fatalf("UpdateUserCustomNav: %v", err)
	}

	u, _ := GetUserByID(db, id)
	if u.CustomNavMode != "grouped" {
		t.Errorf("expected grouped, got %q", u.CustomNavMode)
	}
}

func TestUser_HelperMethods(t *testing.T) {
	u := &User{Username: "alice", Role: RoleAdmin, Status: StatusActive}
	if !u.IsAdmin() {
		t.Error("IsAdmin should be true")
	}
	if !u.IsActive() {
		t.Error("IsActive should be true")
	}
	if u.DisplayOrUsername() != "alice" {
		t.Errorf("DisplayOrUsername: expected alice, got %q", u.DisplayOrUsername())
	}
	u.DisplayName = "Alice"
	if u.DisplayOrUsername() != "Alice" {
		t.Errorf("DisplayOrUsername: expected Alice, got %q", u.DisplayOrUsername())
	}
}

func TestDefaultTheme_Fields(t *testing.T) {
	th := DefaultTheme()
	if th.AccentH != 150 {
		t.Errorf("AccentH: got %d, want 150", th.AccentH)
	}
	if th.FontBody != "Playfair Display" {
		t.Errorf("FontBody: got %q", th.FontBody)
	}
}
