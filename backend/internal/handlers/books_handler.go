package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"
	"unicode"

	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func slugifyBook(title string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(title) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		} else if unicode.IsSpace(r) || r == '-' {
			b.WriteRune('-')
		}
	}
	slug := strings.Trim(b.String(), "-")
	return slug + "-" + strings.ReplaceAll(time.Now().Format("20060102150405"), "", "")
}

func scanBook(row interface{ Scan(...any) error }) (*models.Book, error) {
	b := &models.Book{}
	return b, row.Scan(
		&b.ID, &b.Title, &b.Slug, &b.Subtitle, &b.Description, &b.CoverURL,
		&b.Genre, &b.BookType, &b.Published, &b.SelfPublished, &b.Publisher,
		&b.PublishedAt, &b.AmazonURL, &b.GoodreadsURL, &b.OtherBuyURL,
		&b.Pages, &b.ISBN, &b.Featured, &b.NewRelease, &b.ThemeColor, &b.SortOrder,
		&b.CreatedAt, &b.UpdatedAt,
	)
}

const bookColumns = `
	id, title, slug, subtitle, description, cover_url,
	genre, book_type, published, self_published, publisher,
	published_at, amazon_url, goodreads_url, other_buy_url,
	pages, isbn, featured, new_release, theme_color, sort_order,
	created_at, updated_at`

// ─── GET /api/books ───────────────────────────────────────────────────────────
func GetBooks(c *gin.Context) {
	query := `SELECT` + bookColumns + ` FROM books`
	args := []any{}
	conditions := []string{}

	if genre := c.Query("genre"); genre != "" {
		conditions = append(conditions, "genre = ?")
		args = append(args, genre)
	}
	if bt := c.Query("type"); bt != "" {
		conditions = append(conditions, "book_type = ?")
		args = append(args, bt)
	}
	if c.Query("featured") == "true" {
		conditions = append(conditions, "featured = 1")
	}
	if c.Query("new_release") == "true" {
		conditions = append(conditions, "new_release = 1")
	}
	if c.Query("published") == "true" {
		conditions = append(conditions, "published = 1")
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY new_release DESC, sort_order ASC, created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	books := []*models.Book{}
	for rows.Next() {
		b, err := scanBook(rows)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		books = append(books, b)
	}
	c.JSON(http.StatusOK, books)
}

// ─── GET /api/books/:slug ─────────────────────────────────────────────────────
func GetBook(c *gin.Context) {
	b, err := scanBook(database.DB.QueryRow(
		`SELECT`+bookColumns+` FROM books WHERE slug = ?`, c.Param("slug"),
	))
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "book not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, b)
}

// ─── POST /api/admin/books ────────────────────────────────────────────────────
func CreateBook(c *gin.Context) {
	var in struct {
		Title         string  `json:"title" binding:"required"`
		Subtitle      *string `json:"subtitle"`
		Description   *string `json:"description"`
		CoverURL      *string `json:"cover_url"`
		Genre         *string `json:"genre"`
		BookType      string  `json:"book_type"`
		Published     bool    `json:"published"`
		SelfPublished bool    `json:"self_published"`
		Publisher     *string `json:"publisher"`
		PublishedAt   *string `json:"published_at"`
		AmazonURL     *string `json:"amazon_url"`
		GoodreadsURL  *string `json:"goodreads_url"`
		OtherBuyURL   *string `json:"other_buy_url"`
		Pages         *int    `json:"pages"`
		ISBN          *string `json:"isbn"`
		Featured      bool    `json:"featured"`
		NewRelease    bool    `json:"new_release"`
		ThemeColor    *string `json:"theme_color"`
		SortOrder     int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if in.BookType == "" {
		in.BookType = "novel"
	}
	slug := slugifyBook(in.Title)

	res, err := database.DB.Exec(`
		INSERT INTO books (
			title, slug, subtitle, description, cover_url,
			genre, book_type, published, self_published, publisher,
			published_at, amazon_url, goodreads_url, other_buy_url,
			pages, isbn, featured, new_release, theme_color, sort_order
		) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		in.Title, slug, in.Subtitle, in.Description, in.CoverURL,
		in.Genre, in.BookType, in.Published, in.SelfPublished, in.Publisher,
		in.PublishedAt, in.AmazonURL, in.GoodreadsURL, in.OtherBuyURL,
		in.Pages, in.ISBN, in.Featured, in.NewRelease, in.ThemeColor, in.SortOrder,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	book, _ := scanBook(database.DB.QueryRow(`SELECT`+bookColumns+` FROM books WHERE id = ?`, id))
	c.JSON(http.StatusCreated, book)
}

// ─── PATCH /api/admin/books/:id ───────────────────────────────────────────────
func UpdateBook(c *gin.Context) {
	var in map[string]any
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	allowed := map[string]bool{
		"title": true, "subtitle": true, "description": true, "cover_url": true,
		"genre": true, "book_type": true, "published": true, "self_published": true,
		"publisher": true, "published_at": true, "amazon_url": true,
		"goodreads_url": true, "other_buy_url": true, "pages": true,
		"isbn": true, "featured": true, "new_release": true,
		"theme_color": true, "sort_order": true,
	}

	setClauses := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []any{}
	for k, v := range in {
		if allowed[k] {
			setClauses = append(setClauses, k+" = ?")
			args = append(args, v)
		}
	}
	args = append(args, c.Param("id"))

	_, err := database.DB.Exec(
		"UPDATE books SET "+strings.Join(setClauses, ", ")+" WHERE id = ?",
		args...,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	book, _ := scanBook(database.DB.QueryRow(`SELECT`+bookColumns+` FROM books WHERE id = ?`, c.Param("id")))
	c.JSON(http.StatusOK, book)
}

// ─── POST /api/admin/books/set-featured ──────────────────────────────────────
// Body: { "ids": [1, 3, 5] }  — sets those books as featured, clears all others
func SetFeaturedBooks(c *gin.Context) {
	var in struct {
		IDs []int64 `json:"ids"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(in.IDs) > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "maximum 5 featured books allowed"})
		return
	}
	if _, err := database.DB.Exec("UPDATE books SET featured = 0"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	for _, id := range in.IDs {
		database.DB.Exec("UPDATE books SET featured = 1 WHERE id = ?", id)
	}
	c.JSON(http.StatusOK, gin.H{"featured": in.IDs})
}

// ─── POST /api/admin/books/set-new-release ────────────────────────────────────
// Body: { "id": 3 }  — clears all new_release flags, sets only this book
func SetNewRelease(c *gin.Context) {
	var in struct {
		ID int64 `json:"id"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := database.DB.Exec("UPDATE books SET new_release = 0"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if in.ID > 0 {
		database.DB.Exec("UPDATE books SET new_release = 1 WHERE id = ?", in.ID)
	}
	c.JSON(http.StatusOK, gin.H{"new_release_id": in.ID})
}

// ─── DELETE /api/admin/books/:id ──────────────────────────────────────────────
func DeleteBook(c *gin.Context) {
	if _, err := database.DB.Exec("DELETE FROM books WHERE id = ?", c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}
