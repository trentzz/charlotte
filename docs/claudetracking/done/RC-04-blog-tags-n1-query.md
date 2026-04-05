# RC-04: Fix N+1 blog tag queries and missing admin tags

**Priority**: high  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

Batch-load blog post tags with a single IN query instead of one query per post. Also load tags in `ListAllPosts` so admin content views show correct tag data.

## Finding

`ListPostsByUser` in `internal/models/blog.go` calls `GetPostTags(db, p.ID)` inside a `rows.Next()` loop — one SQL query per post. `ListAllPosts` (admin) does not load tags at all. The recipes model correctly batch-loads attempts as the established pattern.

## Success Criteria

- [ ] `ListPostsByUser` loads all tags for all posts with a single `SELECT ... WHERE post_id IN (...)` query, then maps results back to posts in Go.
- [ ] `ListAllPosts` (admin) also loads tags using the same batch approach.
- [ ] For zero posts, no extra query is executed.
- [ ] `/update` has been run after changes.
