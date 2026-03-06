package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"
)

// ─── Profile (singleton row) ─────────────────────────────────────────────────

// GET /api/profile
func GetProfile(c *gin.Context) {
	var p models.Profile
	err := database.DB.QueryRow(`
		SELECT id, name, tagline, bio, avatar_url, resume_url, email,
		       github_url, linkedin_url, twitter_url, website_url, location, available, updated_at
		FROM profile WHERE id=1`).
		Scan(&p.ID, &p.Name, &p.Tagline, &p.Bio, &p.AvatarURL, &p.ResumeURL,
			&p.Email, &p.GithubURL, &p.LinkedinURL, &p.TwitterURL,
			&p.WebsiteURL, &p.Location, &p.Available, &p.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}
	c.JSON(http.StatusOK, p)
}

// PATCH /api/admin/profile
func UpdateProfile(c *gin.Context) {
	var body struct {
		Name        *string `json:"name"`
		Tagline     *string `json:"tagline"`
		Bio         *string `json:"bio"`
		AvatarURL   *string `json:"avatar_url"`
		ResumeURL   *string `json:"resume_url"`
		Email       *string `json:"email"`
		GithubURL   *string `json:"github_url"`
		LinkedinURL *string `json:"linkedin_url"`
		TwitterURL  *string `json:"twitter_url"`
		WebsiteURL  *string `json:"website_url"`
		Location    *string `json:"location"`
		Available   *bool   `json:"available"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields := map[string]interface{}{}
	if body.Name != nil        { fields["name"] = *body.Name }
	if body.Tagline != nil     { fields["tagline"] = *body.Tagline }
	if body.Bio != nil         { fields["bio"] = *body.Bio }
	if body.AvatarURL != nil   { fields["avatar_url"] = *body.AvatarURL }
	if body.ResumeURL != nil   { fields["resume_url"] = *body.ResumeURL }
	if body.Email != nil       { fields["email"] = *body.Email }
	if body.GithubURL != nil   { fields["github_url"] = *body.GithubURL }
	if body.LinkedinURL != nil { fields["linkedin_url"] = *body.LinkedinURL }
	if body.TwitterURL != nil  { fields["twitter_url"] = *body.TwitterURL }
	if body.WebsiteURL != nil  { fields["website_url"] = *body.WebsiteURL }
	if body.Location != nil    { fields["location"] = *body.Location }
	if body.Available != nil   { fields["available"] = *body.Available }

	for col, val := range fields {
		database.DB.Exec(`UPDATE profile SET `+col+`=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`, val)
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
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
	if body.Company != nil     { fields["company"] = *body.Company }
	if body.Role != nil        { fields["role"] = *body.Role }
	if body.Description != nil { fields["description"] = *body.Description }
	if body.LogoURL != nil     { fields["logo_url"] = *body.LogoURL }
	if body.CompanyURL != nil  { fields["company_url"] = *body.CompanyURL }
	if body.StartedAt != nil   { fields["started_at"] = *body.StartedAt }
	if body.EndedAt != nil     { fields["ended_at"] = *body.EndedAt }
	if body.Current != nil     { fields["current"] = *body.Current }
	if body.SortOrder != nil   { fields["sort_order"] = *body.SortOrder }

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
	if body.Institution != nil { fields["institution"] = *body.Institution }
	if body.Degree != nil      { fields["degree"] = *body.Degree }
	if body.Field != nil       { fields["field"] = *body.Field }
	if body.LogoURL != nil     { fields["logo_url"] = *body.LogoURL }
	if body.StartedAt != nil   { fields["started_at"] = *body.StartedAt }
	if body.EndedAt != nil     { fields["ended_at"] = *body.EndedAt }
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
