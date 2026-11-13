package database

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"supportdesk/backend/models"
)

// Connect opens a PostgreSQL connection and auto-migrates all models.
func Connect(dsn string) (*gorm.DB, error) {
	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Error),
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		return nil, fmt.Errorf("connect to PostgreSQL: %w", err)
	}

	// AutoMigrate all core and advanced tables
	if err := db.AutoMigrate(
		&models.User{},
		&models.Ticket{},
		&models.Comment{},
		&models.TicketHistory{},
	); err != nil {
		return nil, fmt.Errorf("migrate database tables: %w", err)
	}

	return db, nil
}
