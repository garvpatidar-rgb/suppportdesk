package routes

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"supportdesk/backend/controllers"
	"supportdesk/backend/middleware"
	"supportdesk/backend/models"
	"supportdesk/backend/repositories"
	"supportdesk/backend/services"
)

// Setup creates the Gin engine with all routes and middleware wired up.
func Setup(db *gorm.DB) *gin.Engine {
	router := gin.Default()

	// ── CORS Middleware ───────────────────────────────────────────────
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// ── Dependency wiring ────────────────────────────────────────────
	userRepo := repositories.NewUserRepository(db)
	authService := services.NewAuthService(userRepo)
	authCtrl := controllers.NewAuthController(authService)
	ticketCtrl := controllers.NewTicketController(db)

	// ── Public routes ────────────────────────────────────────────────
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "SupportDesk API is running",
		})
	})

	api := router.Group("/api/v1")
	{
		// Auth (public)
		auth := api.Group("/auth")
		{
			auth.POST("/register", authCtrl.Register)
			auth.POST("/login", authCtrl.Login)
			auth.GET("/me", middleware.AuthRequired(), authCtrl.Me)
		}

		// Tickets (protected – must be logged in)
		tickets := api.Group("/tickets")
		tickets.Use(middleware.AuthRequired())
		{
			tickets.POST("", ticketCtrl.Create)
			tickets.GET("", ticketCtrl.List)
			tickets.GET("/search", ticketCtrl.Search)
			tickets.GET("/:id", ticketCtrl.Get)
			tickets.PATCH("/:id", middleware.RoleRequired(models.RoleAgent, models.RoleAdmin), ticketCtrl.Update)
			tickets.PATCH("/:id/status", middleware.RoleRequired(models.RoleAgent, models.RoleAdmin), ticketCtrl.UpdateStatus)
		}
	}

	return router
}
