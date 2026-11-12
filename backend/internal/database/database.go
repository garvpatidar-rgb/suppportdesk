package database

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"supportdesk/backend/internal/models"
)

func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect to PostgreSQL: %w", err)
	}

	if err := db.AutoMigrate(&models.Ticket{}); err != nil {
		return nil, fmt.Errorf("migrate database tables: %w", err)
	}

	return db, nil
}
