package main

import (
	"fmt"
	"log"
	"os"

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

	fmt.Println("Loaded ENV: ", os.Getenv("ADMIN_PASSKEY"), os.Getenv("JWT_SECRET"))

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
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// ─── CORS ────────────────────────────────────────────────────────────────
	frontendOrigin := os.Getenv("FRONTEND_ORIGIN")
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:5173" // Vite default
	}
	r.Use(cors.New(cors.Config{
		// AllowOrigins:     []string{frontendOrigin},
		AllowOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://[::1]:5173",
		},
		AllowMethods:     []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// ─── Static uploads ──────────────────────────────────────────────────────
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
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server running on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
