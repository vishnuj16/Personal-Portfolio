package handlers

import (
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"portfolio-backend/internal/database"
)

// ── Schema (add to database.go migrations) ──────────────────────────────────
//
//   CREATE TABLE IF NOT EXISTS announcements (
//     id         INTEGER PRIMARY KEY AUTOINCREMENT,
//     title      TEXT    NOT NULL DEFAULT '',
//     body       TEXT    NOT NULL DEFAULT '',
//     pinned     INTEGER NOT NULL DEFAULT 0,
//     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
//     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
//   );

type Announcement struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Pinned    bool      `json:"pinned"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GET /api/announcements
func GetAnnouncements(c *gin.Context) {
	rows, err := database.DB.Query(
		`SELECT id, title, body, pinned, created_at, updated_at
		 FROM announcements ORDER BY pinned DESC, created_at DESC`,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	list := []*Announcement{}
	for rows.Next() {
		a := &Announcement{}
		var pinned int
		if err := rows.Scan(&a.ID, &a.Title, &a.Body, &pinned, &a.CreatedAt, &a.UpdatedAt); err != nil {
			continue
		}
		a.Pinned = pinned == 1
		list = append(list, a)
	}
	c.JSON(http.StatusOK, list)
}

// POST /api/admin/announcements
func CreateAnnouncement(c *gin.Context) {
	var body struct {
		Title  string `json:"title"`
		Body   string `json:"body"`
		Pinned bool   `json:"pinned"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	body.Title = strings.TrimSpace(body.Title)
	if body.Title == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "title is required"})
		return
	}

	pinned := 0
	if body.Pinned {
		pinned = 1
	}
	res, err := database.DB.Exec(
		`INSERT INTO announcements (title, body, pinned) VALUES (?, ?, ?)`,
		body.Title, body.Body, pinned,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()

	a := &Announcement{}
	database.DB.QueryRow(
		`SELECT id, title, body, pinned, created_at, updated_at FROM announcements WHERE id = ?`, id,
	).Scan(&a.ID, &a.Title, &a.Body, &pinned, &a.CreatedAt, &a.UpdatedAt)
	a.Pinned = pinned == 1
	c.JSON(http.StatusCreated, a)
}

// PATCH /api/admin/announcements/:id
func UpdateAnnouncement(c *gin.Context) {
	id := c.Param("id")
	var body struct {
		Title  *string `json:"title"`
		Body   *string `json:"body"`
		Pinned *bool   `json:"pinned"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	set := ""
	args := []interface{}{}
	if body.Title != nil {
		set += "title = ?, "
		args = append(args, strings.TrimSpace(*body.Title))
	}
	if body.Body != nil {
		set += "body = ?, "
		args = append(args, *body.Body)
	}
	if body.Pinned != nil {
		set += "pinned = ?, "
		p := 0
		if *body.Pinned {
			p = 1
		}
		args = append(args, p)
	}
	if set == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nothing to update"})
		return
	}
	set += "updated_at = CURRENT_TIMESTAMP"
	args = append(args, id)

	if _, err := database.DB.Exec(`UPDATE announcements SET `+set+` WHERE id = ?`, args...); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	a := &Announcement{}
	var pinned int
	database.DB.QueryRow(
		`SELECT id, title, body, pinned, created_at, updated_at FROM announcements WHERE id = ?`, id,
	).Scan(&a.ID, &a.Title, &a.Body, &pinned, &a.CreatedAt, &a.UpdatedAt)
	a.Pinned = pinned == 1
	c.JSON(http.StatusOK, a)
}

// DELETE /api/admin/announcements/:id
func DeleteAnnouncement(c *gin.Context) {
	id := c.Param("id")
	if _, err := database.DB.Exec(`DELETE FROM announcements WHERE id = ?`, id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}
