# Behaviour Checklist

Manual regression checklist. Run through relevant sections after any UI change.

---

## Authentication

- [ ] Register a new user — account created, redirected to dashboard
- [ ] Log in with correct credentials — session established
- [ ] Log in with wrong password — error shown, no session
- [ ] Log out — session cleared, redirected to login
- [ ] Access a protected page while logged out — redirected to login
- [ ] Email verification link works and marks account as verified

---

## Dashboard navigation

- [ ] All sidebar nav links load the correct page (Homepage, Profile, Appearance, Features, Blog, About, Gallery, Recipes, Projects)
- [ ] All admin nav links load the correct page (Users, Content, Settings, Appearance)
- [ ] Appearance link in admin nav navigates to `/admin/appearance`

---

## Homepage builder

- [ ] Homepage widget grid loads with saved layout
- [ ] Drag to reposition a widget — layout saves automatically
- [ ] Resize a widget — layout saves automatically
- [ ] Add a new widget from the palette — appears on canvas
- [ ] Remove a widget — disappears from canvas
- [ ] Album widget shows cover photo and album name below the image
- [ ] Homepage cards have no visible border and blend into the background

---

## Gallery

- [ ] Gallery list loads all albums
- [ ] Album visibility toggle (eye icon) flips published state
- [ ] No "Unpublished" text chip appears — only the toggle icon
- [ ] Create new album — appears in list
- [ ] Upload photo to album — photo appears in album
- [ ] Delete album — removed from list
- [ ] Public gallery page shows album cards with rounded corners
- [ ] Album names are visible on the public gallery page

---

## Blog

- [ ] Blog list loads all posts with status (Published / Draft)
- [ ] Published/Draft toggle in BlogEdit does not shift the switch position when toggled
- [ ] Create post — appears in list
- [ ] Edit post — changes saved
- [ ] Delete post — removed from list

---

## Recipes

- [ ] Recipes list loads
- [ ] Create recipe — appears in list
- [ ] Edit recipe — changes saved
- [ ] Published/Draft toggle in RecipeEdit does not shift when toggled

---

## Projects

- [ ] Projects list loads
- [ ] Create project — appears in list
- [ ] Published/Draft toggle does not shift when toggled

---

## Appearance (user)

- [ ] `/dashboard/appearance` loads with current theme values
- [ ] Changing accent colour updates the live preview
- [ ] Saving persists the theme across page reload

---

## Appearance (admin / site-wide)

- [ ] `/admin/appearance` is reachable via the admin sidebar "Appearance" link
- [ ] Changing site theme values and saving persists across reload

---

## Public profile pages

- [ ] `/u/<username>` loads the user's homepage
- [ ] `/u/<username>/gallery` shows published albums only
- [ ] `/u/<username>/blog` shows published posts only
- [ ] Unpublished content is not visible on public pages

---

## File uploads

- [ ] Uploading a photo within the 10 MB limit succeeds
- [ ] Uploading a file above the limit returns an error
