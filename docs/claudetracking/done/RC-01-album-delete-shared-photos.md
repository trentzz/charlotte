# RC-01: Fix album deletion destroying shared photos

**Priority**: critical  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

When a gallery album is deleted, photos that are also linked to other albums must not have their files deleted and their DB rows must not be removed. Only the join-table link between the deleted album and its photos should be removed. Photos should only be fully deleted (file + DB row) when they no longer belong to any album.

## Finding

`DashAlbumDelete` in `internal/api/dash_gallery.go` iterates all photos in the album and deletes their files from disk and their DB rows (via `photos.album_id ON DELETE CASCADE`). Because photos can belong to multiple albums via the `album_photos` join table, deleting album A silently destroys photos that album B still references.

## Success Criteria

- [ ] Album delete only removes the join-table entries for that album, not the photo files or DB rows.
- [ ] After album delete, photos shared with other albums still appear in those albums.
- [ ] Photos are only fully deleted (file + row) if their `album_id` is the deleted album AND they have no other album associations in `album_photos`.
- [ ] The `ON DELETE CASCADE` on `photos.album_id` is either removed or its effect is confined to photos not referenced elsewhere.
- [ ] `/update` has been run after changes.
