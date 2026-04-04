# Charlotte — Feature Suggestions

Ideas for future development. None of these are implemented yet. Each entry describes the feature, explains its value, and gives a rough complexity estimate.

---

## 1. Content and creation

### Bookmarks / reading list

Users can save a public "reading list" of links to external articles, papers, or pages — similar to a pinboard. Each bookmark has a URL, optional title override, and a short note. Readers can see what the person finds worth sharing without requiring a full blog post. Renders as a clean list page at `/u/{username}/bookmarks`.

**Complexity:** Low

---

### Series / post collections

A blog post can be assigned to a named series (e.g. "Learning Rust", "Japan trip"). The public blog post page shows a navigation strip at the bottom: previous and next posts in the series, with the series title. Encourages longer-form multi-part writing and gives readers a clear path through related content.

**Complexity:** Medium

---

### Notes (micro-posts)

A lightweight short-form content type: plain text, no title, no slug, up to ~500 characters. Notes sit alongside blog posts in the dashboard but render on a separate `/u/{username}/notes` page and optionally appear in the homepage grid as a widget. Useful for quick thoughts that do not warrant a full post.

**Complexity:** Medium

---

### Changelog / timeline

A structured changelog widget and page: dated entries with a title and short description, rendered as a vertical timeline. Useful for project pages, personal milestones, or public dev logs. Entries are created from the dashboard and can be pinned to the homepage grid.

**Complexity:** Medium

---

### Recipe scaling

On any public recipe page, a serving-size input lets readers adjust the yield. Ingredient quantities recalculate in real time in the browser. The backend stores quantities as structured numbers (already close to this with `ingredients_json`); the frontend handles the multiplication. No server round-trip required.

**Complexity:** Medium

---

### Post scheduling

Blog posts can be given a future publish date. The server checks every minute and flips `published = true` when the scheduled time is reached. The dashboard shows a "Scheduled" status badge distinct from "Draft" and "Published". Useful for users who write in batches and want to spread publication.

**Complexity:** Medium

---

## 2. Discovery and social

### RSS / Atom feeds

Each user gets a feed at `/u/{username}/feed.xml` covering their blog posts. Optional per-section feeds: `/u/{username}/blog/feed.xml`, `/u/{username}/recipes/feed.xml`. The feed includes the full post body so readers can subscribe in any feed reader without visiting the site. No account required to subscribe.

**Complexity:** Low

---

### Sitemap and meta tags

Auto-generated `/u/{username}/sitemap.xml` listing all public pages. Each public page gets appropriate `<meta>` tags: `og:title`, `og:description`, `og:image` (from the first image in the post or the album cover). Makes sharing on Mastodon, LinkedIn, and iMessage produce rich previews. Implemented server-side in the Go handlers.

**Complexity:** Low

---

### Search within a user's content

A `/u/{username}/search?q=` endpoint (and a search box in the nav) that does full-text search across a user's published blog posts, recipes, and projects. SQLite's FTS5 extension handles the index. Returns a unified results page with content-type labels. No external services required.

**Complexity:** Medium

---

### Webmention support

Receive Webmentions sent to any public page and display them as a "Mentions" section at the bottom of blog posts. A background worker validates incoming mentions by fetching the source URL and checking it links back. Webmention is a W3C standard; support means other IndieWeb sites can link to Charlotte users and have those links surface automatically.

**Complexity:** High

---

## 3. Personalisation and design

### Custom domain support

Users can point their own domain (e.g. `alice.com`) at the Charlotte instance and have it serve their profile. The Go server reads an `X-Forwarded-Host` header (set by the reverse proxy) and resolves it to a username via a stored mapping. The dashboard has a field for the custom domain and shows DNS instructions.

**Complexity:** High

---

### Per-section accent colour override

The existing theme applies one accent colour everywhere. Allow users to set a secondary accent for specific sections — e.g. a warm amber for recipes, a cool blue for projects. Stored as optional overrides in the theme JSON. Applied via an additional CSS custom property scoped to the section layout.

**Complexity:** Low

---

### Custom CSS field

An optional freeform CSS textarea in Dashboard → Appearance, injected as a `<style>` block at the end of `<head>` on public pages only. Power users can override anything the theme system does not expose. Input is sanitised to strip `<script>` tags and `url()` values pointing to external hosts.

**Complexity:** Low

---

### Cover / banner image per section

Users can upload a banner image for their blog, gallery, recipes, or projects section page. The banner renders as a full-width image below the section title, cropped to a fixed aspect ratio (e.g. 4:1). Gives each section a distinct editorial identity. Stored as one optional image per content type.

**Complexity:** Low

---

## 4. Analytics and insights

### Page view counts

Track anonymous page views per post, per recipe, and per album. The server increments a counter in SQLite on each GET (de-duplicated by IP + day). The dashboard overview page shows view counts next to each piece of content. No JavaScript tracking, no external service, no cookies required.

**Complexity:** Low

---

### Referrer log

Record the `Referer` header on public page requests and surface the top 10 referrers per user in the dashboard. Shows where visitors come from (search engines, social links, other sites) without a third-party analytics product. Stored in a rolling 30-day table, pruned nightly.

**Complexity:** Medium

---

### Reading time estimates

Calculate and display an estimated reading time on blog posts and recipes. Done server-side at render time: word count divided by 200 wpm, rounded to the nearest minute. Displayed as a muted label ("5 min read") below the post title. No configuration required.

**Complexity:** Low

---

## 5. Platform and admin

### Invite-only registration

Admins can generate single-use invite tokens. The register page accepts an optional `?invite=TOKEN` parameter; if registration is closed, a valid token is the only way to register. The admin panel lists active and used tokens and has a "Generate invite" button. Useful for running a private instance for a known group.

**Complexity:** Low

---

### Email notifications

Users can store an email address in their profile (not publicly shown). The server sends a notification when a new comment or Webmention arrives (if those features are enabled). Requires an SMTP config in the server environment (`SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`). No third-party email service needed.

**Complexity:** Medium

---

### Storage quota per user

Admins set a per-user upload quota (in MB) from the admin panel. The server checks total upload size before accepting a new file and rejects with a `413` if the quota is exceeded. The dashboard shows current usage as a progress bar. Prevents a single user from filling the server's disk on a shared instance.

**Complexity:** Medium

---
