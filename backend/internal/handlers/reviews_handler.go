package handlers

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// ─── Book reviews (curated praise shown on the book page) ────────────────────

var reviewSources = map[string]bool{
	"amazon": true, "goodreads": true, "press": true, "author": true, "other": true,
}

const reviewColumns = `
	id, book_id, quote, reviewer, reviewer_title, source, source_url,
	rating, starred, sort_order, created_at, updated_at`

func scanReview(row interface{ Scan(...any) error }) (*models.BookReview, error) {
	r := &models.BookReview{}
	return r, row.Scan(
		&r.ID, &r.BookID, &r.Quote, &r.Reviewer, &r.ReviewerTitle, &r.Source, &r.SourceURL,
		&r.Rating, &r.Starred, &r.SortOrder, &r.CreatedAt, &r.UpdatedAt,
	)
}

func fetchBookReviews(bookID int64) ([]models.BookReview, error) {
	rows, err := database.DB.Query(
		`SELECT`+reviewColumns+` FROM book_reviews WHERE book_id = ? ORDER BY sort_order, id`, bookID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := []models.BookReview{}
	for rows.Next() {
		r, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, *r)
	}
	return reviews, rows.Err()
}

// reviewInput uses pointers so PATCH can tell "not sent" from "cleared".
type reviewInput struct {
	Quote         *string `json:"quote"`
	Reviewer      *string `json:"reviewer"`
	ReviewerTitle *string `json:"reviewer_title"`
	Source        *string `json:"source"`
	SourceURL     *string `json:"source_url"`
	Rating        *int    `json:"rating"`
	ClearRating   bool    `json:"clear_rating"` // JSON null can't be told apart from "not sent"
	Starred       *bool   `json:"starred"`
}

// columns validates the input and returns column → value for every supplied field.
// Empty optional strings are stored as NULL.
func (in reviewInput) columns() (map[string]any, error) {
	cols := map[string]any{}
	nullable := func(s *string) any {
		if v := strings.TrimSpace(*s); v != "" {
			return v
		}
		return nil
	}

	if in.Quote != nil {
		q := strings.TrimSpace(*in.Quote)
		if q == "" {
			return nil, errors.New("quote is required")
		}
		cols["quote"] = q
	}
	if in.Reviewer != nil {
		cols["reviewer"] = nullable(in.Reviewer)
	}
	if in.ReviewerTitle != nil {
		cols["reviewer_title"] = nullable(in.ReviewerTitle)
	}
	if in.Source != nil {
		if !reviewSources[*in.Source] {
			return nil, errors.New("source must be one of amazon, goodreads, press, author, other")
		}
		cols["source"] = *in.Source
	}
	if in.SourceURL != nil {
		u := strings.TrimSpace(*in.SourceURL)
		if u != "" {
			parsed, err := url.Parse(u)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
				return nil, errors.New("source_url must be an http(s) link")
			}
		}
		cols["source_url"] = nullable(&u)
	}
	if in.ClearRating {
		cols["rating"] = nil
	} else if in.Rating != nil {
		if *in.Rating < 1 || *in.Rating > 5 {
			return nil, errors.New("rating must be between 1 and 5")
		}
		cols["rating"] = *in.Rating
	}
	if in.Starred != nil {
		cols["starred"] = *in.Starred
	}
	return cols, nil
}

func getReview(id any) (*models.BookReview, error) {
	return scanReview(database.DB.QueryRow(`SELECT`+reviewColumns+` FROM book_reviews WHERE id = ?`, id))
}

// ─── POST /api/admin/books/:id/reviews ───────────────────────────────────────
func CreateReview(c *gin.Context) {
	bookID := c.Param("id")

	var exists int
	if err := database.DB.QueryRow(`SELECT COUNT(*) FROM books WHERE id = ?`, bookID).Scan(&exists); err != nil || exists == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "book not found"})
		return
	}

	var in reviewInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if in.Quote == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "quote is required"})
		return
	}
	cols, err := in.columns()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	names := []string{"book_id", "sort_order"}
	placeholders := []string{"?", "(SELECT COALESCE(MAX(sort_order), -1) + 1 FROM book_reviews WHERE book_id = ?)"}
	args := []any{bookID, bookID}
	for col, val := range cols {
		names = append(names, col)
		placeholders = append(placeholders, "?")
		args = append(args, val)
	}

	res, err := database.DB.Exec(
		`INSERT INTO book_reviews (`+strings.Join(names, ", ")+`) VALUES (`+strings.Join(placeholders, ", ")+`)`,
		args...,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	r, err := getReview(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, r)
}

// ─── PATCH /api/admin/reviews/:id ────────────────────────────────────────────
func UpdateReview(c *gin.Context) {
	var in reviewInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	cols, err := in.columns()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(cols) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nothing to update"})
		return
	}

	set := []string{"updated_at = CURRENT_TIMESTAMP"}
	args := []any{}
	for col, val := range cols {
		set = append(set, col+" = ?")
		args = append(args, val)
	}
	args = append(args, c.Param("id"))

	res, err := database.DB.Exec(`UPDATE book_reviews SET `+strings.Join(set, ", ")+` WHERE id = ?`, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
		return
	}
	r, err := getReview(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, r)
}

// ─── DELETE /api/admin/reviews/:id ───────────────────────────────────────────
func DeleteReview(c *gin.Context) {
	res, err := database.DB.Exec(`DELETE FROM book_reviews WHERE id = ?`, c.Param("id"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if n, _ := res.RowsAffected(); n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "review not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// ─── POST /api/admin/books/:id/reviews/reorder ───────────────────────────────
// Body: { "ids": [4, 1, 3] } — every review of the book, in display order
func ReorderReviews(c *gin.Context) {
	var in struct {
		IDs []int64 `json:"ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer tx.Rollback()

	for i, id := range in.IDs {
		res, err := tx.Exec(
			`UPDATE book_reviews SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND book_id = ?`,
			i, id, c.Param("id"),
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "review does not belong to this book"})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	bookID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	reviews, err := fetchBookReviews(bookID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, reviews)
}
