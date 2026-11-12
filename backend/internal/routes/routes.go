package routes

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"supportdesk/backend/internal/handlers"
)

func Setup(db *gorm.DB) *gin.Engine {
	router := gin.Default()
	ticketHandler := handlers.NewTicketHandler(db)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "SupportDesk API is running",
		})
	})

	api := router.Group("/api/v1")
	{
		api.POST("/tickets", ticketHandler.Create)
		api.GET("/tickets", ticketHandler.List)
		api.GET("/tickets/:id", ticketHandler.Get)
		api.PATCH("/tickets/:id", ticketHandler.Update)
		api.PATCH("/tickets/:id/status", ticketHandler.UpdateStatus)
	}

	return router
}
