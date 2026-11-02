package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const maxUploadSize = 5 << 20 // 5 MB

// Upload folders the admin UI uses; anything else is rejected so a crafted
// bucket like "../dist" can't write outside ./uploads.
var uploadBuckets = map[string]bool{
	"books": true, "profile": true, "avatars": true, "projects": true, "skills": true,
	"categories": true, "experiences": true, "education": true, "misc": true,
}

// POST /api/admin/upload
// Accepts multipart form field "file" and optional "bucket" (skills|categories|projects|avatars)
func UploadFile(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadSize)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".svg": true, ".gif": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only image files are allowed (jpg, jpeg, png, webp, svg, gif)"})
		return
	}

	bucket := c.DefaultPostForm("bucket", "misc")
	if !uploadBuckets[bucket] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown upload bucket"})
		return
	}
	uploadDir := filepath.Join("uploads", bucket)
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

	// Build public URL — assumes Gin serves /uploads/** as static
	publicURL := fmt.Sprintf("/uploads/%s/%s", bucket, filename)
	c.JSON(http.StatusOK, gin.H{
		"url":      publicURL,
		"filename": filename,
		"bucket":   bucket,
	})
}

// DELETE /api/admin/upload
// Body: { "path": "/uploads/skills/xyz.png" }
func DeleteFile(c *gin.Context) {
	var body struct {
		Path string `json:"path" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Safety: only allow deletion of files strictly inside ./uploads/
	target, ok := insideUploads(body.Path)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "path is outside uploads directory"})
		return
	}

	if err := os.Remove(target); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found or already deleted"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}

// insideUploads resolves a public path like "/uploads/skills/x.png" and reports
// whether it points at a file strictly inside the uploads directory.
func insideUploads(publicPath string) (string, bool) {
	root, err := filepath.Abs("uploads")
	if err != nil {
		return "", false
	}
	target, err := filepath.Abs(filepath.Clean(strings.TrimPrefix(publicPath, "/")))
	if err != nil {
		return "", false
	}
	if !strings.HasPrefix(target, root+string(filepath.Separator)) {
		return "", false
	}
	return target, true
}

// SecureUploads sets headers for user-uploaded files: they're served as inert
// content, so an uploaded SVG opened directly can't run script on this origin.
func SecureUploads() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Next()
	}
}
