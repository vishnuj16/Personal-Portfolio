package handlers

import (
	"fmt"
	"html"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"portfolio-backend/internal/database"

	"github.com/gin-gonic/gin"
)

// ─── Link previews ───────────────────────────────────────────────────────────
//
// Social apps and chat clients don't run JavaScript, so the SPA's index.html is
// rewritten per request with Open Graph / Twitter tags for the page being shared.

const defaultTitle = "By Vishnu"

type pageMeta struct {
	Title       string
	Description string
	Image       string // absolute URL or empty
	URL         string // absolute URL
	Type        string // og:type
}

var (
	bookPath = regexp.MustCompile(`^/book/([^/]+)/?$`)
	titleTag = regexp.MustCompile(`<title>[^<]*</title>`)
)

// ServeIndex writes the SPA entry point with link-preview tags for the request path.
func ServeIndex(c *gin.Context, distDir string) {
	raw, err := os.ReadFile(filepath.Join(distDir, "index.html"))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "frontend build not found"})
		return
	}

	meta := resolveMeta(c)
	c.Header("Cache-Control", "no-cache")
	c.Data(http.StatusOK, "text/html; charset=utf-8", injectMeta(raw, meta))
}

func resolveMeta(c *gin.Context) pageMeta {
	base := siteURL(c)
	path := c.Request.URL.Path

	meta := pageMeta{
		Title:       defaultTitle,
		Description: "Software developer and author — projects, books and stories by Vishnu.",
		URL:         base + path,
		Type:        "website",
	}

	var name, tagline, authorTagline, avatar *string
	database.DB.QueryRow(`SELECT name, tagline, author_tagline, avatar_url FROM profile WHERE id = 1`).
		Scan(&name, &tagline, &authorTagline, &avatar)

	if m := bookPath.FindStringSubmatch(path); m != nil {
		if bm, ok := bookMeta(m[1], base); ok {
			bm.URL = meta.URL
			return bm
		}
		return meta
	}

	if path == "/author" || strings.HasPrefix(path, "/author/") {
		meta.Title = "Stories by Vyas"
		if v := deref(authorTagline); v != "" {
			meta.Description = v
		}
	} else if v := deref(tagline); v != "" {
		meta.Description = v
	}
	if v := deref(avatar); v != "" {
		meta.Image = absoluteURL(base, v)
	}
	return meta
}

func bookMeta(slug, base string) (pageMeta, bool) {
	var id int64
	var title string
	var subtitle, description, cover *string
	err := database.DB.QueryRow(
		`SELECT id, title, subtitle, description, cover_url FROM books WHERE slug = ?`, slug,
	).Scan(&id, &title, &subtitle, &description, &cover)
	if err != nil {
		return pageMeta{}, false
	}

	meta := pageMeta{Title: title + " — " + defaultTitle, Type: "book"}
	if v := deref(subtitle); v != "" {
		meta.Title = title + ": " + v + " — " + defaultTitle
	}

	// Prefer the top starred review as the preview line; fall back to the blurb.
	var quote, reviewer *string
	database.DB.QueryRow(
		`SELECT quote, reviewer FROM book_reviews WHERE book_id = ? AND starred = 1 ORDER BY sort_order, id LIMIT 1`, id,
	).Scan(&quote, &reviewer)
	if q := deref(quote); q != "" {
		meta.Description = "“" + truncate(q, 180) + "”"
		if r := deref(reviewer); r != "" {
			meta.Description += " — " + r
		}
	} else {
		meta.Description = truncate(stripMarkup(deref(description)), 200)
	}

	if v := deref(cover); v != "" {
		meta.Image = absoluteURL(base, v)
	}
	return meta, true
}

func injectMeta(page []byte, m pageMeta) []byte {
	e := html.EscapeString
	var b strings.Builder
	fmt.Fprintf(&b, "<title>%s</title>\n", e(m.Title))
	fmt.Fprintf(&b, "    <meta name=\"description\" content=\"%s\" />\n", e(m.Description))
	fmt.Fprintf(&b, "    <link rel=\"canonical\" href=\"%s\" />\n", e(m.URL))
	fmt.Fprintf(&b, "    <meta property=\"og:site_name\" content=\"%s\" />\n", defaultTitle)
	fmt.Fprintf(&b, "    <meta property=\"og:type\" content=\"%s\" />\n", e(m.Type))
	fmt.Fprintf(&b, "    <meta property=\"og:title\" content=\"%s\" />\n", e(m.Title))
	fmt.Fprintf(&b, "    <meta property=\"og:description\" content=\"%s\" />\n", e(m.Description))
	fmt.Fprintf(&b, "    <meta property=\"og:url\" content=\"%s\" />\n", e(m.URL))
	card := "summary"
	if m.Image != "" {
		fmt.Fprintf(&b, "    <meta property=\"og:image\" content=\"%s\" />\n", e(m.Image))
		fmt.Fprintf(&b, "    <meta name=\"twitter:image\" content=\"%s\" />\n", e(m.Image))
		card = "summary_large_image"
	}
	fmt.Fprintf(&b, "    <meta name=\"twitter:card\" content=\"%s\" />\n", card)
	fmt.Fprintf(&b, "    <meta name=\"twitter:title\" content=\"%s\" />\n", e(m.Title))
	fmt.Fprintf(&b, "    <meta name=\"twitter:description\" content=\"%s\" />", e(m.Description))

	s := string(page)
	if titleTag.MatchString(s) {
		s = titleTag.ReplaceAllLiteralString(s, b.String())
	} else {
		s = strings.Replace(s, "</head>", b.String()+"\n  </head>", 1)
	}
	return []byte(s)
}

// siteURL is the public origin used for absolute preview URLs.
// SITE_URL (e.g. https://byvishnu.in) wins; otherwise it's derived from the request.
func siteURL(c *gin.Context) string {
	if v := strings.TrimRight(os.Getenv("SITE_URL"), "/"); v != "" {
		return v
	}
	scheme := "http"
	if c.Request.TLS != nil || c.GetHeader("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}
	return scheme + "://" + c.Request.Host
}

func absoluteURL(base, u string) string {
	if strings.HasPrefix(u, "http://") || strings.HasPrefix(u, "https://") {
		return u
	}
	return base + "/" + strings.TrimPrefix(u, "/")
}

var (
	mdLink   = regexp.MustCompile(`\[([^\]]+)\]\([^)]+\)`)
	mdMarks  = regexp.MustCompile(`\*\*|__|(^|\s)_|_(\s|$)`)
	mdPrefix = regexp.MustCompile(`(?m)^(#{1,3}|[-*]|\d+\.)\s+`)
	spaces   = regexp.MustCompile(`\s+`)
)

// stripMarkup removes the RichText syntax used in book descriptions.
func stripMarkup(s string) string {
	s = mdLink.ReplaceAllString(s, "$1")
	s = mdPrefix.ReplaceAllString(s, "")
	s = mdMarks.ReplaceAllString(s, "$1$2")
	return strings.TrimSpace(spaces.ReplaceAllString(s, " "))
}

func truncate(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	cut := string(r[:max])
	if i := strings.LastIndex(cut, " "); i > max/2 {
		cut = cut[:i]
	}
	return strings.TrimRight(cut, " ,.;:—-") + "…"
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return strings.TrimSpace(*s)
}
