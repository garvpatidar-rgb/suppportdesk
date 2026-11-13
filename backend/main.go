package main

import (
	"log"

	"supportdesk/backend/config"
	"supportdesk/backend/database"
	"supportdesk/backend/routes"
	"supportdesk/backend/utils"
)

func main() {
	// Load configuration from environment variables.
	cfg := config.Load()

	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL environment variable must be set")
	}

	// Initialise the JWT signing key.
	utils.SetJWTSecret(cfg.JWTSecret)

	// Connect to PostgreSQL and run migrations.
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}

	// Build the Gin router and start listening.
	router := routes.Setup(db)
	log.Printf("SupportDesk API starting on port %s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
