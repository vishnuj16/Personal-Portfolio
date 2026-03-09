package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

const (
	resumeDir      = "uploads/resume"
	resumePath     = "uploads/resume/resume.pdf"
	resumeMaxBytes = 10 << 20 // 10 MB
)

// POST /api/admin/resume/upload
//
// Multipart form field: "file" — PDF only.
// Always stored as uploads/resume/resume.pdf (one canonical file, always replaced).
func UploadResume(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, resumeMaxBytes)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}
	defer file.Close()

	// Strict: extension must be .pdf
	if filepath.Ext(header.Filename) != ".pdf" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "only PDF files are accepted"})
		return
	}

	// Content-Type check — reject anything explicitly non-PDF
	// (allow application/octet-stream since some OS/browsers send that for PDFs)
	ct := header.Header.Get("Content-Type")
	if ct != "" && ct != "application/pdf" && ct != "application/octet-stream" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("invalid content-type %q — upload a PDF file", ct),
		})
		return
	}

	if err := os.MkdirAll(resumeDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create resume directory"})
		return
	}

	// Overwrites any previous resume atomically
	if err := c.SaveUploadedFile(header, resumePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save resume: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":     "/api/resume",
		"message": "resume uploaded",
	})
}

// GET /api/resume — public
// HEAD /api/resume — public (used by frontend to check if resume exists)
//
// ?download=true  → Content-Disposition: attachment (browser download)
// default         → Content-Disposition: inline (opens PDF viewer in browser)
func ServeResume(c *gin.Context) {
	exists := true
	if _, err := os.Stat(resumePath); os.IsNotExist(err) {
		exists = false
	}

	// HEAD: never send a body — just status + headers
	if c.Request.Method == http.MethodHead {
		if !exists {
			c.Status(http.StatusNotFound)
		} else {
			c.Header("Content-Type", "application/pdf")
			c.Status(http.StatusOK)
		}
		return
	}

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "no resume uploaded yet"})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Cache-Control", "no-cache")

	if c.Query("download") == "true" {
		c.Header("Content-Disposition", `attachment; filename="resume.pdf"`)
	} else {
		c.Header("Content-Disposition", `inline; filename="resume.pdf"`)
	}

	c.File(resumePath)
}

// DELETE /api/admin/resume — admin only
func DeleteResume(c *gin.Context) {
	if _, err := os.Stat(resumePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "no resume to delete"})
		return
	}
	if err := os.Remove(resumePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted": true})
}
