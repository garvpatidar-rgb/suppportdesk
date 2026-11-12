package main

import (
	"log"
	"os"

	"supportdesk/backend/internal/database"
	"supportdesk/backend/internal/routes"
)

func main() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL must be set")
	}

	db, err := database.Connect(dsn)
	if err != nil {
		log.Fatal(err)
	}

	router := routes.Setup(db)
	if err := router.Run(":8080"); err != nil {
		log.Fatal(err)
	}
}
