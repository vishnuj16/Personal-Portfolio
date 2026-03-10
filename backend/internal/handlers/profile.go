package handlers

import (
	"net/http"
	"strconv"

	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"

	"github.com/gin-gonic/gin"
)

// ─── Profile (singleton row) ─────────────────────────────────────────────────

// ── GET /api/profile ──────────────────────────────────────────────────────────
// Returns the single profile row (id=1). Creates it if it doesn't exist yet.
func GetProfile(c *gin.Context) {
	p, err := fetchProfile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// ── PATCH /api/admin/profile ──────────────────────────────────────────────────
// Accepts a partial JSON body and updates only the supplied fields.
// Callers MUST send only the keys they own (dev fields or author fields)
// to avoid cross-mode overwrites.
func UpdateProfile(c *gin.Context) {
	// Decode into a plain map so we only touch supplied keys
	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(body) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no fields supplied"})
		return
	}

	// Allowed columns — guards against injection; maps JSON key → column name
	allowed := map[string]string{
		"name":           "name",
		"tagline":        "tagline",
		"bio":            "bio",
		"dev_bio":        "dev_bio",
		"author_bio":     "author_bio",
		"avatar_url":     "avatar_url",
		"resume_url":     "resume_url",
		"email":          "email",
		"phone":          "phone",
		"github_url":     "github_url",
		"linkedin_url":   "linkedin_url",
		"twitter_url":    "twitter_url",
		"website_url":    "website_url",
		"location":       "location",
		"available":      "available",
		"author_tagline": "author_tagline",
	}

	setClauses := ""
	args := []interface{}{}

	for jsonKey, col := range allowed {
		val, ok := body[jsonKey]
		if !ok {
			continue
		}
		if setClauses != "" {
			setClauses += ", "
		}
		setClauses += col + " = ?"
		// Convert bool available → int for SQLite
		if jsonKey == "available" {
			switch v := val.(type) {
			case bool:
				if v {
					args = append(args, 1)
				} else {
					args = append(args, 0)
				}
			default:
				args = append(args, val)
			}
		} else {
			args = append(args, val)
		}
	}

	if setClauses == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no recognised fields supplied"})
		return
	}

	setClauses += ", updated_at = CURRENT_TIMESTAMP"

	// Upsert: insert a row if none exists, then update
	_, err := database.DB.Exec(`INSERT OR IGNORE INTO profile (id) VALUES (1)`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	args = append(args, 1) // WHERE id = 1
	_, err = database.DB.Exec(
		`UPDATE profile SET `+setClauses+` WHERE id = ?`,
		args...,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the updated profile
	p, err := fetchProfile()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// ── fetchProfile ──────────────────────────────────────────────────────────────
func fetchProfile() (*models.Profile, error) {
	// Ensure the row exists
	_, err := database.DB.Exec(`INSERT OR IGNORE INTO profile (id) VALUES (1)`)
	if err != nil {
		return nil, err
	}

	p := &models.Profile{}
	err = database.DB.QueryRow(`
		SELECT
			id, name, tagline, bio, dev_bio, author_bio,
			avatar_url, resume_url, email, phone,
			github_url, linkedin_url, twitter_url, website_url,
			location, available, author_tagline, updated_at
		FROM profile WHERE id = 1
	`).Scan(
		&p.ID,
		&p.Name,
		&p.Tagline,
		&p.Bio,
		&p.DevBio,
		&p.AuthorBio,
		&p.AvatarURL,
		&p.ResumeURL,
		&p.Email,
		&p.Phone,
		&p.GithubURL,
		&p.LinkedinURL,
		&p.TwitterURL,
		&p.WebsiteURL,
		&p.Location,
		&p.Available,
		&p.AuthorTagline,
		&p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return p, nil
}

// ─── Experience ──────────────────────────────────────────────────────────────

// GET /api/experiences
func ListExperiences(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, company, role, description, logo_url, company_url,
		       started_at, ended_at, current, sort_order, created_at, updated_at
		FROM experiences ORDER BY current DESC, started_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	exps := []models.Experience{}
	for rows.Next() {
		var e models.Experience
		rows.Scan(&e.ID, &e.Company, &e.Role, &e.Description, &e.LogoURL,
			&e.CompanyURL, &e.StartedAt, &e.EndedAt, &e.Current,
			&e.SortOrder, &e.CreatedAt, &e.UpdatedAt)
		exps = append(exps, e)
	}
	c.JSON(http.StatusOK, exps)
}

// POST /api/admin/experiences
func CreateExperience(c *gin.Context) {
	var body struct {
		Company     string  `json:"company" binding:"required"`
		Role        string  `json:"role" binding:"required"`
		Description *string `json:"description"`
		LogoURL     *string `json:"logo_url"`
		CompanyURL  *string `json:"company_url"`
		StartedAt   string  `json:"started_at" binding:"required"`
		EndedAt     *string `json:"ended_at"`
		Current     bool    `json:"current"`
		SortOrder   int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := database.DB.Exec(`
		INSERT INTO experiences (company, role, description, logo_url, company_url,
		                         started_at, ended_at, current, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		body.Company, body.Role, body.Description, body.LogoURL, body.CompanyURL,
		body.StartedAt, body.EndedAt, body.Current, body.SortOrder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// PATCH /api/admin/experiences/:id
func UpdateExperience(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		Company     *string `json:"company"`
		Role        *string `json:"role"`
		Description *string `json:"description"`
		LogoURL     *string `json:"logo_url"`
		CompanyURL  *string `json:"company_url"`
		StartedAt   *string `json:"started_at"`
		EndedAt     *string `json:"ended_at"`
		Current     *bool   `json:"current"`
		SortOrder   *int    `json:"sort_order"`
	}
	c.ShouldBindJSON(&body)

	fields := map[string]interface{}{}
	if body.Company != nil {
		fields["company"] = *body.Company
	}
	if body.Role != nil {
		fields["role"] = *body.Role
	}
	if body.Description != nil {
		fields["description"] = *body.Description
	}
	if body.LogoURL != nil {
		fields["logo_url"] = *body.LogoURL
	}
	if body.CompanyURL != nil {
		fields["company_url"] = *body.CompanyURL
	}
	if body.StartedAt != nil {
		fields["started_at"] = *body.StartedAt
	}
	if body.EndedAt != nil {
		fields["ended_at"] = *body.EndedAt
	}
	if body.Current != nil {
		fields["current"] = *body.Current
	}
	if body.SortOrder != nil {
		fields["sort_order"] = *body.SortOrder
	}

	for col, val := range fields {
		database.DB.Exec(`UPDATE experiences SET `+col+`=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, val, id)
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// DELETE /api/admin/experiences/:id
func DeleteExperience(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	database.DB.Exec(`DELETE FROM experiences WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// ─── Education ───────────────────────────────────────────────────────────────

// GET /api/education
func ListEducation(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, institution, degree, field, logo_url, started_at, ended_at, created_at, updated_at
		FROM education ORDER BY started_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	edu := []models.Education{}
	for rows.Next() {
		var e models.Education
		rows.Scan(&e.ID, &e.Institution, &e.Degree, &e.Field, &e.LogoURL,
			&e.StartedAt, &e.EndedAt, &e.CreatedAt, &e.UpdatedAt)
		edu = append(edu, e)
	}
	c.JSON(http.StatusOK, edu)
}

// POST /api/admin/education
func CreateEducation(c *gin.Context) {
	var body struct {
		Institution string  `json:"institution" binding:"required"`
		Degree      *string `json:"degree"`
		Field       *string `json:"field"`
		LogoURL     *string `json:"logo_url"`
		StartedAt   *string `json:"started_at"`
		EndedAt     *string `json:"ended_at"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	res, err := database.DB.Exec(`
		INSERT INTO education (institution, degree, field, logo_url, started_at, ended_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		body.Institution, body.Degree, body.Field, body.LogoURL, body.StartedAt, body.EndedAt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id})
}

// PATCH /api/admin/education/:id
func UpdateEducation(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		Institution *string `json:"institution"`
		Degree      *string `json:"degree"`
		Field       *string `json:"field"`
		LogoURL     *string `json:"logo_url"`
		StartedAt   *string `json:"started_at"`
		EndedAt     *string `json:"ended_at"`
	}
	c.ShouldBindJSON(&body)
	fields := map[string]interface{}{}
	if body.Institution != nil {
		fields["institution"] = *body.Institution
	}
	if body.Degree != nil {
		fields["degree"] = *body.Degree
	}
	if body.Field != nil {
		fields["field"] = *body.Field
	}
	if body.LogoURL != nil {
		fields["logo_url"] = *body.LogoURL
	}
	if body.StartedAt != nil {
		fields["started_at"] = *body.StartedAt
	}
	if body.EndedAt != nil {
		fields["ended_at"] = *body.EndedAt
	}
	for col, val := range fields {
		database.DB.Exec(`UPDATE education SET `+col+`=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, val, id)
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// DELETE /api/admin/education/:id
func DeleteEducation(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	database.DB.Exec(`DELETE FROM education WHERE id=?`, id)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}
