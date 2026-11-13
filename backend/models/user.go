package models

import "time"

// User role constants.
const (
	RoleCustomer = "customer"
	RoleAgent    = "agent"
	RoleAdmin    = "admin"
)

// User represents a registered user in the system.
// The Password field is excluded from JSON responses via the "-" tag.
type User struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name" gorm:"not null"`
	Email     string    `json:"email" gorm:"uniqueIndex;not null"`
	Password  string    `json:"-" gorm:"not null"`
	Role      string    `json:"role" gorm:"not null;default:customer"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
