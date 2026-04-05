# RC-10: Decode WebP image dimensions on upload

**Priority**: low  
**Epic**: REVIEW-CYCLE-2026-04-05

## Goal

WebP uploads should have their width and height stored correctly, matching the behaviour for JPEG/PNG/GIF.

## Finding

`internal/storage/upload.go` imports `image/jpeg`, `image/png`, `image/gif` for `image.DecodeConfig` but not `golang.org/x/image/webp`. WebP files pass MIME validation but have width=0, height=0 in the database.

## Success Criteria

- [ ] `golang.org/x/image/webp` is imported as a blank import in `upload.go` so the WebP decoder registers with the `image` package.
- [ ] WebP uploads store correct width and height values.
- [ ] `/update` has been run after changes.
