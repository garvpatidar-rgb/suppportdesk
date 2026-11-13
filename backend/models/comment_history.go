package models

import "time"

// Comment represents a message or note in a ticket conversation.
type Comment struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	TicketID   uint      `json:"ticket_id" gorm:"not null;index"`
	AuthorID   uint      `json:"author_id" gorm:"not null"`
	Author     User      `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
	Body       string    `json:"body" gorm:"not null"`
	IsInternal bool      `json:"is_internal" gorm:"default:false"` // true = only visible to agents/admins
	CreatedAt  time.Time `json:"created_at"`
}

// TicketHistory logs every lifecycle or assignment change for auditing.
type TicketHistory struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	TicketID  uint      `json:"ticket_id" gorm:"not null;index"`
	UserID    uint      `json:"user_id" gorm:"not null"`
	User      User      `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Action    string    `json:"action" gorm:"not null"` // e.g. "created", "status_change", "assigned"
	Details   string    `json:"details" gorm:"not null"` // e.g. "Status changed from open to in_progress"
	CreatedAt time.Time `json:"created_at"`
}
