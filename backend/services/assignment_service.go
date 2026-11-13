package services

import (
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"supportdesk/backend/models"
)

// AssignmentService manages intelligent and concurrency-safe ticket distribution.
type AssignmentService struct {
	db *gorm.DB
}

// NewAssignmentService returns a new instance of AssignmentService.
func NewAssignmentService(db *gorm.DB) *AssignmentService {
	return &AssignmentService{db: db}
}

// AssignTicketIntelligently picks the best available support agent for the ticket's category.
// It executes inside a DB transaction with row-level locking (clause.Locking)
// to prevent race conditions when multiple tickets are created concurrently.
func (s *AssignmentService) AssignTicketIntelligently(tx *gorm.DB, ticket *models.Ticket) (*models.User, error) {
	var agents []models.User

	// 1. Fetch available agents with row-level lock (FOR UPDATE)
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("role = ? AND is_available = ?", models.RoleAgent, true).
		Find(&agents).Error

	if err != nil || len(agents) == 0 {
		return nil, nil // No agents online; ticket remains unassigned
	}

	type agentWorkload struct {
		agent models.User
		count int64
	}

	var bestCandidate *models.User
	var minLoad int64 = 999999

	// 2. Filter by skill match and check capacity
	for _, agent := range agents {
		// Check skill (comma-separated: e.g. "Payment,Technical")
		hasSkill := false
		skills := strings.Split(agent.Skills, ",")
		for _, sk := range skills {
			if strings.EqualFold(strings.TrimSpace(sk), ticket.Category) {
				hasSkill = true
				break
			}
		}

		// Count current active tickets for this agent
		var activeCount int64
		tx.Model(&models.Ticket{}).
			Where("agent_id = ? AND status IN (?)", agent.ID, []string{models.TicketStatusOpen, models.TicketStatusInProgress}).
			Count(&activeCount)

		// Check capacity limit
		if int(activeCount) >= agent.MaxCapacity {
			continue // At capacity
		}

		// Prioritize agents with matching skill and lowest active workload
		if hasSkill {
			if activeCount < minLoad {
				minLoad = activeCount
				bestCandidate = &agent
			}
		} else if bestCandidate == nil {
			// Fallback: lowest loaded agent even if not primary skill
			if activeCount < minLoad {
				minLoad = activeCount
				bestCandidate = &agent
			}
		}
	}

	if bestCandidate != nil {
		ticket.AgentID = &bestCandidate.ID
	}

	return bestCandidate, nil
}
