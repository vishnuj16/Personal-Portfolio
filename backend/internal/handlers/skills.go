package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"
)

// ─── Skill Categories ────────────────────────────────────────────────────────

// GET /api/categories
func ListCategories(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT id, name, slug, image_url, sort_order, created_at, updated_at
		FROM skill_categories ORDER BY sort_order, name`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	cats := []models.SkillCategory{}
	for rows.Next() {
		var cat models.SkillCategory
		if err := rows.Scan(&cat.ID, &cat.Name, &cat.Slug, &cat.ImageURL,
			&cat.SortOrder, &cat.CreatedAt, &cat.UpdatedAt); err != nil {
			continue
		}
		cat.Skills = fetchSkillsByCategoryID(cat.ID)
		cats = append(cats, cat)
	}
	c.JSON(http.StatusOK, cats)
}

// POST /api/admin/categories
func CreateCategory(c *gin.Context) {
	var body struct {
		Name      string  `json:"name" binding:"required"`
		ImageURL  *string `json:"image_url"`
		SortOrder int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := models.Slugify(body.Name)
	res, err := database.DB.Exec(`
		INSERT INTO skill_categories (name, slug, image_url, sort_order)
		VALUES (?, ?, ?, ?)`, body.Name, slug, body.ImageURL, body.SortOrder)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "category already exists or db error: " + err.Error()})
		return
	}

	id, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id, "slug": slug})
}

// PATCH /api/admin/categories/:id
func UpdateCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		Name      *string `json:"name"`
		ImageURL  *string `json:"image_url"`
		SortOrder *int    `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Name != nil {
		slug := models.Slugify(*body.Name)
		database.DB.Exec(`UPDATE skill_categories SET name=?, slug=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.Name, slug, id)
	}
	if body.ImageURL != nil {
		database.DB.Exec(`UPDATE skill_categories SET image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.ImageURL, id)
	}
	if body.SortOrder != nil {
		database.DB.Exec(`UPDATE skill_categories SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.SortOrder, id)
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// DELETE /api/admin/categories/:id
func DeleteCategory(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	res, err := database.DB.Exec(`DELETE FROM skill_categories WHERE id=?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// ─── Skills ──────────────────────────────────────────────────────────────────

// GET /api/skills
func ListSkills(c *gin.Context) {
	catID := c.Query("category_id")
	var rows *sql.Rows
	var err error

	if catID != "" {
		rows, err = database.DB.Query(`
			SELECT id, category_id, name, slug, image_url, proficiency, years, sort_order, created_at, updated_at
			FROM skills WHERE category_id=? ORDER BY sort_order, name`, catID)
	} else {
		rows, err = database.DB.Query(`
			SELECT id, category_id, name, slug, image_url, proficiency, years, sort_order, created_at, updated_at
			FROM skills ORDER BY category_id, sort_order, name`)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	skills := []models.Skill{}
	for rows.Next() {
		var s models.Skill
		rows.Scan(&s.ID, &s.CategoryID, &s.Name, &s.Slug, &s.ImageURL,
			&s.Proficiency, &s.Years, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
		skills = append(skills, s)
	}
	c.JSON(http.StatusOK, skills)
}

// POST /api/admin/skills
func CreateSkill(c *gin.Context) {
	var body struct {
		CategoryID  int64   `json:"category_id" binding:"required"`
		Name        string  `json:"name" binding:"required"`
		ImageURL    *string `json:"image_url"`
		Proficiency int     `json:"proficiency"`
		Years       float64 `json:"years"`
		SortOrder   int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	slug := models.Slugify(body.Name)
	res, err := database.DB.Exec(`
		INSERT INTO skills (category_id, name, slug, image_url, proficiency, years, sort_order)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		body.CategoryID, body.Name, slug, body.ImageURL, body.Proficiency, body.Years, body.SortOrder)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "skill already exists or db error: " + err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id, "slug": slug})
}

// PATCH /api/admin/skills/:id
func UpdateSkill(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	var body struct {
		CategoryID  *int64   `json:"category_id"`
		Name        *string  `json:"name"`
		ImageURL    *string  `json:"image_url"`
		Proficiency *int     `json:"proficiency"`
		Years       *float64 `json:"years"`
		SortOrder   *int     `json:"sort_order"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.CategoryID != nil {
		database.DB.Exec(`UPDATE skills SET category_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.CategoryID, id)
	}
	if body.Name != nil {
		slug := models.Slugify(*body.Name)
		database.DB.Exec(`UPDATE skills SET name=?, slug=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.Name, slug, id)
	}
	if body.ImageURL != nil {
		database.DB.Exec(`UPDATE skills SET image_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.ImageURL, id)
	}
	if body.Proficiency != nil {
		database.DB.Exec(`UPDATE skills SET proficiency=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.Proficiency, id)
	}
	if body.Years != nil {
		database.DB.Exec(`UPDATE skills SET years=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.Years, id)
	}
	if body.SortOrder != nil {
		database.DB.Exec(`UPDATE skills SET sort_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, *body.SortOrder, id)
	}
	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// DELETE /api/admin/skills/:id
func DeleteSkill(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	res, err := database.DB.Exec(`DELETE FROM skills WHERE id=?`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// helper used by ListCategories to embed skills
func fetchSkillsByCategoryID(categoryID int64) []models.Skill {
	rows, err := database.DB.Query(`
		SELECT id, category_id, name, slug, image_url, proficiency, years, sort_order, created_at, updated_at
		FROM skills WHERE category_id=? ORDER BY sort_order, name`, categoryID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []models.Skill
	for rows.Next() {
		var s models.Skill
		rows.Scan(&s.ID, &s.CategoryID, &s.Name, &s.Slug, &s.ImageURL,
			&s.Proficiency, &s.Years, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
		out = append(out, s)
	}
	return out
}
