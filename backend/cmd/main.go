package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"portfolio-backend/internal/auth"
	"portfolio-backend/internal/database"
	"portfolio-backend/internal/handlers"
	"portfolio-backend/internal/middleware"
)

func main() {
	// Load .env if present
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	// Validate required env vars
	if os.Getenv("ADMIN_PASSKEY") == "" || os.Getenv("JWT_SECRET") == "" {
		log.Fatal("ADMIN_PASSKEY and JWT_SECRET must be set")
	}

	// Init DB
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./portfolio.db"
	}
	database.Init(dbPath)

	// Gin mode
	ginMode := resolveGinMode()
	gin.SetMode(ginMode)

	r := gin.Default()
	if err := r.SetTrustedProxies(resolveTrustedProxies()); err != nil {
		log.Fatalf("Failed to set trusted proxies: %v", err)
	}

	frontendDistDir, err := resolveFrontendDistDir()
	if err != nil {
		log.Printf("Frontend dist directory not found: %v", err)
	}

	// ─── CORS ────────────────────────────────────────────────────────────────
	corsConfig := buildCORSConfig(ginMode)
	if corsConfig != nil {
		r.Use(cors.New(*corsConfig))
	}

	// ─── Static uploads ──────────────────────────────────────────────────────
	if err := os.MkdirAll("./uploads", 0o755); err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}
	r.Static("/uploads", "./uploads")

	// ─── Auth ────────────────────────────────────────────────────────────────
	r.POST("/api/auth/verify", auth.VerifyPasskey)

	// ─── Public read-only API ────────────────────────────────────────────────
	api := r.Group("/api")
	{
		api.GET("/profile", handlers.GetProfile)

		api.GET("/categories", handlers.ListCategories)
		api.GET("/skills", handlers.ListSkills)

		api.GET("/projects", handlers.ListProjects)
		api.GET("/projects/:slug", handlers.GetProject)

		api.GET("/experiences", handlers.ListExperiences)
		api.GET("/education", handlers.ListEducation)

		api.GET("/resume", handlers.ServeResume)
		api.HEAD("/resume", handlers.ServeResume)

		// Books — public
		api.GET("/books", handlers.GetBooks)
		api.GET("/books/:slug", handlers.GetBook)

		//Announcements public
		api.GET("/announcements", handlers.GetAnnouncements)
	}

	// ─── Admin API (JWT-protected) ───────────────────────────────────────────
	admin := r.Group("/api/admin", middleware.AdminOnly())
	{
		// Profile
		admin.PATCH("/profile", handlers.UpdateProfile)

		// Skill categories
		admin.POST("/categories", handlers.CreateCategory)
		admin.PATCH("/categories/:id", handlers.UpdateCategory)
		admin.DELETE("/categories/:id", handlers.DeleteCategory)

		// Skills
		admin.POST("/skills", handlers.CreateSkill)
		admin.PATCH("/skills/:id", handlers.UpdateSkill)
		admin.DELETE("/skills/:id", handlers.DeleteSkill)

		// Projects
		admin.POST("/projects", handlers.CreateProject)
		admin.PATCH("/projects/:id", handlers.UpdateProject)
		admin.DELETE("/projects/:id", handlers.DeleteProject)
		admin.POST("/projects/:id/images", handlers.AddProjectImage)
		admin.DELETE("/projects/images/:imageId", handlers.DeleteProjectImage)

		// Experience
		admin.POST("/experiences", handlers.CreateExperience)
		admin.PATCH("/experiences/:id", handlers.UpdateExperience)
		admin.DELETE("/experiences/:id", handlers.DeleteExperience)

		// Education
		admin.POST("/education", handlers.CreateEducation)
		admin.PATCH("/education/:id", handlers.UpdateEducation)
		admin.DELETE("/education/:id", handlers.DeleteEducation)

		// File uploads
		admin.POST("/upload", handlers.UploadFile)
		admin.DELETE("/upload", handlers.DeleteFile)

		// Resume actions
		admin.POST("/resume/upload", handlers.UploadResume)
		admin.DELETE("/resume", handlers.DeleteResume)

		// Books — admin
		admin.POST("/books", handlers.CreateBook)
		admin.POST("/books/set-featured", handlers.SetFeaturedBooks) // must be before :id route
		admin.POST("/books/set-new-release", handlers.SetNewRelease) // must be before :id route
		admin.PATCH("/books/:id", handlers.UpdateBook)
		admin.DELETE("/books/:id", handlers.DeleteBook)

		//Announcemtns - admin
		admin.POST("/announcements", handlers.CreateAnnouncement)
		admin.PATCH("/announcements/:id", handlers.UpdateAnnouncement)
		admin.DELETE("/announcements/:id", handlers.DeleteAnnouncement)
	}

	// Serve the React SPA for all non-API routes (enables deep linking)
	r.NoRoute(func(c *gin.Context) {
		if strings.HasPrefix(c.Request.URL.Path, "/api") {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}

		if frontendDistDir == "" {
			c.JSON(404, gin.H{"error": "frontend build not found"})
			return
		}

		requestPath := strings.TrimPrefix(filepath.Clean(c.Request.URL.Path), "/")
		if requestPath != "." && requestPath != "" {
			assetPath := filepath.Join(frontendDistDir, requestPath)
			if info, err := os.Stat(assetPath); err == nil && !info.IsDir() {
				c.File(assetPath)
				return
			}
		}

		c.File(filepath.Join(frontendDistDir, "index.html"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("Server running on :%s in %s mode", port, ginMode)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed: %v", err)
	}
}

func resolveGinMode() string {
	mode := strings.ToLower(strings.TrimSpace(os.Getenv("GIN_MODE")))
	switch mode {
	case gin.DebugMode, gin.TestMode, gin.ReleaseMode:
		return mode
	case "":
		return gin.ReleaseMode
	default:
		log.Printf("Invalid GIN_MODE %q, defaulting to %s", mode, gin.ReleaseMode)
		return gin.ReleaseMode
	}
}

func buildCORSConfig(ginMode string) *cors.Config {
	origins := parseCSVEnv("FRONTEND_ORIGIN")
	if len(origins) == 0 && ginMode == gin.DebugMode {
		origins = []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://[::1]:5173",
		}
	}

	if len(origins) == 0 {
		return nil
	}

	config := cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}

	if err := config.Validate(); err != nil {
		log.Fatalf("Invalid CORS configuration: %v", err)
	}

	return &config
}

func resolveTrustedProxies() []string {
	proxies := parseCSVEnv("TRUSTED_PROXIES")
	if len(proxies) == 0 {
		return nil
	}
	return proxies
}

func parseCSVEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}

	parts := strings.Split(raw, ",")
	values := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value != "" {
			values = append(values, value)
		}
	}
	return values
}

func resolveFrontendDistDir() (string, error) {
	if configured := os.Getenv("FRONTEND_DIST_DIR"); configured != "" {
		if info, err := os.Stat(configured); err == nil && info.IsDir() {
			return configured, nil
		}
	}

	candidates := []string{
		"./portfolio/dist",
		"../portfolio/dist",
		"../../portfolio/dist",
		"./dist",
	}

	for _, candidate := range candidates {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			absPath, err := filepath.Abs(candidate)
			if err != nil {
				return candidate, nil
			}
			return absPath, nil
		}
	}

	return "", fmt.Errorf("set FRONTEND_DIST_DIR or build the frontend into one of: %s", strings.Join(candidates, ", "))
}
