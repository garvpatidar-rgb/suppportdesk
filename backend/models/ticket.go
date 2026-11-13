package models

import "time"

// Ticket status constants.
const (
	TicketStatusOpen       = "open"
	TicketStatusInProgress = "in_progress"
	TicketStatusResolved   = "resolved"
)

// Ticket represents a customer support request.
type Ticket struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Subject     string    `json:"subject" gorm:"not null"`
	Description string    `json:"description" gorm:"not null"`
	Category    string    `json:"category" gorm:"not null"`
	Priority    string    `json:"priority" gorm:"not null;default:normal"`
	Status      string    `json:"status" gorm:"not null;default:open"`
	CustomerID  uint      `json:"customer_id" gorm:"not null;index"`
	Customer    User      `json:"customer,omitempty" gorm:"foreignKey:CustomerID"`
	AgentID     *uint     `json:"agent_id" gorm:"index"`
	Agent       *User     `json:"agent,omitempty" gorm:"foreignKey:AgentID"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
