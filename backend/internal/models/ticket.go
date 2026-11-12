package models

import "time"

const (
	TicketStatusOpen       = "open"
	TicketStatusInProgress = "in_progress"
	TicketStatusResolved   = "resolved"
)

type Ticket struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Subject     string    `json:"subject" gorm:"not null"`
	Description string    `json:"description" gorm:"not null"`
	Category    string    `json:"category" gorm:"not null"`
	Priority    string    `json:"priority" gorm:"not null;default:normal"`
	Status      string    `json:"status" gorm:"not null;default:open"`
	CreatedAt   time.Time `json:"created_at"`
}
