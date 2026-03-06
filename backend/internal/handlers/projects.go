package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"portfolio-backend/internal/database"
	"portfolio-backend/internal/models"
)

// GET /api/projects
func ListProjects(c *gin.Context) {
	query := `
		SELECT id, title, slug, summary, description, cover_url, repo_url, live_url,
		       status, featured, sort_order, started_at, ended_at, created_at, updated_at
		FROM projects`

	filters := []string{}
	args := []interface{}{}

	if status := c.Query("status"); status != "" {
		filters = append(filters, "status=?")
		args = append(args, status)
	}
	if featured := c.Query("featured"); featured == "true" {
		filters = append(filters, "featured=1")
	}
	if len(filters) > 0 {
		query += " WHERE " + strings.Join(filters, " AND ")
	}
	query += " ORDER BY featured DESC, sort_order, created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer rows.Close()

	projects := []models.Project{}
	for rows.Next() {
		var p models.Project
		rows.Scan(&p.ID, &p.Title, &p.Slug, &p.Summary, &p.Description,
			&p.CoverURL, &p.RepoURL, &p.LiveURL, &p.Status,
			&p.Featured, &p.SortOrder, &p.StartedAt, &p.EndedAt,
			&p.CreatedAt, &p.UpdatedAt)
		p.Tags = fetchProjectTags(p.ID)
		p.Skills = fetchProjectSkills(p.ID)
		p.Images = fetchProjectImages(p.ID)
		projects = append(projects, p)
	}
	c.JSON(http.StatusOK, projects)
}

// GET /api/projects/:slug
func GetProject(c *gin.Context) {
	slug := c.Param("slug")
	var p models.Project
	err := database.DB.QueryRow(`
		SELECT id, title, slug, summary, description, cover_url, repo_url, live_url,
		       status, featured, sort_order, started_at, ended_at, created_at, updated_at
		FROM projects WHERE slug=?`, slug).
		Scan(&p.ID, &p.Title, &p.Slug, &p.Summary, &p.Description,
			&p.CoverURL, &p.RepoURL, &p.LiveURL, &p.Status,
			&p.Featured, &p.SortOrder, &p.StartedAt, &p.EndedAt,
			&p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	p.Tags = fetchProjectTags(p.ID)
	p.Skills = fetchProjectSkills(p.ID)
	p.Images = fetchProjectImages(p.ID)
	c.JSON(http.StatusOK, p)
}

// POST /api/admin/projects
func CreateProject(c *gin.Context) {
	var body struct {
		Title       string   `json:"title" binding:"required"`
		Summary     *string  `json:"summary"`
		Description *string  `json:"description"`
		CoverURL    *string  `json:"cover_url"`
		RepoURL     *string  `json:"repo_url"`
		LiveURL     *string  `json:"live_url"`
		Status      string   `json:"status"`
		Featured    bool     `json:"featured"`
		SortOrder   int      `json:"sort_order"`
		StartedAt   *string  `json:"started_at"`
		EndedAt     *string  `json:"ended_at"`
		Tags        []string `json:"tags"`
		SkillIDs    []int64  `json:"skill_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.Status == "" {
		body.Status = "completed"
	}
	slug := models.Slugify(body.Title)

	res, err := database.DB.Exec(`
		INSERT INTO projects (title, slug, summary, description, cover_url, repo_url, live_url,
		                      status, featured, sort_order, started_at, ended_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		body.Title, slug, body.Summary, body.Description, body.CoverURL,
		body.RepoURL, body.LiveURL, body.Status, body.Featured,
		body.SortOrder, body.StartedAt, body.EndedAt)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "project slug conflict or db error: " + err.Error()})
		return
	}

	id, _ := res.LastInsertId()
	syncProjectTags(id, body.Tags)
	syncProjectSkills(id, body.SkillIDs)

	c.JSON(http.StatusCreated, gin.H{"id": id, "slug": slug})
}

// PATCH /api/admin/projects/:id
func UpdateProject(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	var body struct {
		Title       *string  `json:"title"`
		Summary     *string  `json:"summary"`
		Description *string  `json:"description"`
		CoverURL    *string  `json:"cover_url"`
		RepoURL     *string  `json:"repo_url"`
		LiveURL     *string  `json:"live_url"`
		Status      *string  `json:"status"`
		Featured    *bool    `json:"featured"`
		SortOrder   *int     `json:"sort_order"`
		StartedAt   *string  `json:"started_at"`
		EndedAt     *string  `json:"ended_at"`
		Tags        []string `json:"tags"`
		SkillIDs    []int64  `json:"skill_ids"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	fields := map[string]interface{}{}
	if body.Title != nil {
		fields["title"] = *body.Title
		fields["slug"] = models.Slugify(*body.Title)
	}
	if body.Summary != nil     { fields["summary"] = *body.Summary }
	if body.Description != nil { fields["description"] = *body.Description }
	if body.CoverURL != nil    { fields["cover_url"] = *body.CoverURL }
	if body.RepoURL != nil     { fields["repo_url"] = *body.RepoURL }
	if body.LiveURL != nil     { fields["live_url"] = *body.LiveURL }
	if body.Status != nil      { fields["status"] = *body.Status }
	if body.Featured != nil    { fields["featured"] = *body.Featured }
	if body.SortOrder != nil   { fields["sort_order"] = *body.SortOrder }
	if body.StartedAt != nil   { fields["started_at"] = *body.StartedAt }
	if body.EndedAt != nil     { fields["ended_at"] = *body.EndedAt }

	for col, val := range fields {
		database.DB.Exec(`UPDATE projects SET `+col+`=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`, val, id)
	}

	if body.Tags != nil      { syncProjectTags(id, body.Tags) }
	if body.SkillIDs != nil  { syncProjectSkills(id, body.SkillIDs) }

	c.JSON(http.StatusOK, gin.H{"updated": true})
}

// DELETE /api/admin/projects/:id
func DeleteProject(c *gin.Context) {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	res, err := database.DB.Exec(`DELETE FROM projects WHERE id=?`, id)
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

// POST /api/admin/projects/:id/images
// Accepts multipart/form-data: file (required), caption (optional), sort_order (optional)
func AddProjectImage(c *gin.Context) {
	projectID, _ := strconv.ParseInt(c.Param("id"), 10, 64)

	// Verify project exists
	var exists int
	err := database.DB.QueryRow(`SELECT COUNT(*) FROM projects WHERE id=?`, projectID).Scan(&exists)
	if err != nil || exists == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}

	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 5<<20)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only image files allowed (jpg, jpeg, png, webp, gif)"})
		return
	}

	uploadDir := filepath.Join("uploads", "projects")
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create upload directory"})
		return
	}

	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	dst := filepath.Join(uploadDir, filename)
	if err := c.SaveUploadedFile(header, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save file: " + err.Error()})
		return
	}

	publicURL := fmt.Sprintf("/uploads/projects/%s", filename)
	caption := c.PostForm("caption")
	sortOrderStr := c.DefaultPostForm("sort_order", "0")
	sortOrder, _ := strconv.Atoi(sortOrderStr)

	var captionPtr *string
	if caption != "" {
		captionPtr = &caption
	}

	res, err := database.DB.Exec(`
		INSERT INTO project_images (project_id, url, caption, sort_order)
		VALUES (?, ?, ?, ?)`, projectID, publicURL, captionPtr, sortOrder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{"id": id, "url": publicURL})
}

// DELETE /api/admin/projects/images/:imageId
func DeleteProjectImage(c *gin.Context) {
	imgID, _ := strconv.ParseInt(c.Param("imageId"), 10, 64)
	database.DB.Exec(`DELETE FROM project_images WHERE id=?`, imgID)
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// ─── helpers ─────────────────────────────────────────────────────────────────

func fetchProjectTags(projectID int64) []string {
	rows, _ := database.DB.Query(`SELECT tag FROM project_tags WHERE project_id=? ORDER BY tag`, projectID)
	if rows == nil { return nil }
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var t string
		rows.Scan(&t)
		tags = append(tags, t)
	}
	return tags
}

func fetchProjectSkills(projectID int64) []models.Skill {
	rows, _ := database.DB.Query(`
		SELECT s.id, s.category_id, s.name, s.slug, s.image_url, s.proficiency, s.years, s.sort_order, s.created_at, s.updated_at
		FROM skills s JOIN project_skills ps ON ps.skill_id=s.id WHERE ps.project_id=?`, projectID)
	if rows == nil { return nil }
	defer rows.Close()
	var skills []models.Skill
	for rows.Next() {
		var s models.Skill
		rows.Scan(&s.ID, &s.CategoryID, &s.Name, &s.Slug, &s.ImageURL,
			&s.Proficiency, &s.Years, &s.SortOrder, &s.CreatedAt, &s.UpdatedAt)
		skills = append(skills, s)
	}
	return skills
}

func fetchProjectImages(projectID int64) []models.ProjectImage {
	rows, _ := database.DB.Query(`
		SELECT id, project_id, url, caption, sort_order FROM project_images
		WHERE project_id=? ORDER BY sort_order`, projectID)
	if rows == nil { return nil }
	defer rows.Close()
	var imgs []models.ProjectImage
	for rows.Next() {
		var img models.ProjectImage
		rows.Scan(&img.ID, &img.ProjectID, &img.URL, &img.Caption, &img.SortOrder)
		imgs = append(imgs, img)
	}
	return imgs
}

func syncProjectTags(projectID int64, tags []string) {
	database.DB.Exec(`DELETE FROM project_tags WHERE project_id=?`, projectID)
	for _, tag := range tags {
		database.DB.Exec(`INSERT OR IGNORE INTO project_tags (project_id, tag) VALUES (?, ?)`, projectID, tag)
	}
}

func syncProjectSkills(projectID int64, skillIDs []int64) {
	database.DB.Exec(`DELETE FROM project_skills WHERE project_id=?`, projectID)
	for _, sid := range skillIDs {
		database.DB.Exec(`INSERT OR IGNORE INTO project_skills (project_id, skill_id) VALUES (?, ?)`, projectID, sid)
	}
}