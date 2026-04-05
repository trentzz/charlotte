# RC12-02: Feature flags not persisted on registration

**Priority**: medium (high user impact)
**Epic**: REVIEW-CYCLE-2026-04-05b

## Finding

`CreateUser` in `internal/models/user.go` does not include `feature_blog`, `feature_about`, `feature_gallery`, `feature_recipes`, `feature_projects` in the INSERT. The `Register` handler sets these to `true` on the in-memory struct but they are never written to the DB. New users get all features disabled (DB default = 0).

## Success Criteria

- [ ] `CreateUser` INSERT includes all five feature flag columns set to `1` (enabled by default).
- [ ] A newly registered user has all features enabled without needing to visit the Features page.
- [ ] `/update` has been run after changes.
