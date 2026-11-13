package controllers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"supportdesk/backend/models"
	"supportdesk/backend/services"
)

// TicketController handles HTTP requests for tickets, comments, and audit history.
type TicketController struct {
	db                *gorm.DB
	assignmentService *services.AssignmentService
}

// NewTicketController returns a new TicketController.
func NewTicketController(db *gorm.DB, assignmentService *services.AssignmentService) *TicketController {
	return &TicketController{
		db:                db,
		assignmentService: assignmentService,
	}
}

type createTicketRequest struct {
	Subject     string `json:"subject" binding:"required"`
	Description string `json:"description" binding:"required"`
	Category    string `json:"category" binding:"required"`
	Priority    string `json:"priority"`
}

type createCommentRequest struct {
	Body       string `json:"body" binding:"required"`
	IsInternal bool   `json:"is_internal"`
}

type updateTicketStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

// Create handles POST /api/v1/tickets with Intelligent Auto-Assignment & Audit Log
func (ctrl *TicketController) Create(c *gin.Context) {
	var request createTicketRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject, description, and category are required"})
		return
	}

	priority := request.Priority
	if priority == "" {
		priority = "normal"
	}

	customerID, _ := c.Get("user_id")

	ticket := models.Ticket{
		Subject:     request.Subject,
		Description: request.Description,
		Category:    request.Category,
		Priority:    priority,
		Status:      models.TicketStatusOpen,
		CustomerID:  customerID.(uint),
	}

	// Concurrency-Safe Transaction: Auto-Assign & Log
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		// Run Auto-Assignment Algorithm
		assignedAgent, err := ctrl.assignmentService.AssignTicketIntelligently(tx, &ticket)
		if err != nil {
			return err
		}

		if err := tx.Create(&ticket).Error; err != nil {
			return err
		}

		// Log ticket creation in Audit Trail
		historyText := "Ticket created by customer."
		if assignedAgent != nil {
			historyText = fmt.Sprintf("Ticket created and automatically assigned to agent %s based on skill [%s].", assignedAgent.Name, ticket.Category)
		} else {
			historyText = "Ticket created (currently unassigned - awaiting available agent)."
		}

		return tx.Create(&models.TicketHistory{
			TicketID: ticket.ID,
			UserID:   customerID.(uint),
			Action:   "created",
			Details:  historyText,
		}).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create ticket"})
		return
	}

	// Preload relations
	ctrl.db.Preload("Customer").Preload("Agent").First(&ticket, ticket.ID)
	c.JSON(http.StatusCreated, ticket)
}

// List handles GET /api/v1/tickets with relations preloaded
func (ctrl *TicketController) List(c *gin.Context) {
	var tickets []models.Ticket

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	query := ctrl.db.Preload("Customer").Preload("Agent").Order("id desc")

	if userRole.(string) == models.RoleCustomer {
		query = query.Where("customer_id = ?", userID.(uint))
	}

	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list tickets"})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

// Get handles GET /api/v1/tickets/:id
func (ctrl *TicketController) Get(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var ticket models.Ticket
	if err := ctrl.db.Preload("Customer").Preload("Agent").First(&ticket, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get ticket"})
		return
	}

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	if userRole.(string) == models.RoleCustomer && ticket.CustomerID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// UpdateStatus handles PATCH /api/v1/tickets/:id/status
func (ctrl *TicketController) UpdateStatus(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var request updateTicketStatusRequest
	if err := c.ShouldBindJSON(&request); err != nil || !validTicketStatus(request.Status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be open, in_progress, or resolved"})
		return
	}

	userID, _ := c.Get("user_id")

	var ticket models.Ticket
	err := ctrl.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&ticket, id).Error; err != nil {
			return err
		}

		oldStatus := ticket.Status
		ticket.Status = request.Status
		if err := tx.Save(&ticket).Error; err != nil {
			return err
		}

		// Log status change in Audit Trail
		return tx.Create(&models.TicketHistory{
			TicketID: ticket.ID,
			UserID:   userID.(uint),
			Action:   "status_change",
			Details:  fmt.Sprintf("Status updated from [%s] to [%s]", oldStatus, request.Status),
		}).Error
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update status"})
		return
	}

	ctrl.db.Preload("Customer").Preload("Agent").First(&ticket, id)
	c.JSON(http.StatusOK, ticket)
}

// Comments: Add comment or private internal note
func (ctrl *TicketController) AddComment(c *gin.Context) {
	ticketID, ok := parseTicketID(c)
	if !ok {
		return
	}

	var req createCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "comment body is required"})
		return
	}

	userID, _ := c.Get("user_id")
	userRole, _ := c.Get("user_role")

	// Customers cannot create internal private notes
	if userRole.(string) == models.RoleCustomer {
		req.IsInternal = false
	}

	comment := models.Comment{
		TicketID:   ticketID,
		AuthorID:   userID.(uint),
		Body:       req.Body,
		IsInternal: req.IsInternal,
	}

	if err := ctrl.db.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not add comment"})
		return
	}

	ctrl.db.Preload("Author").First(&comment, comment.ID)
	c.JSON(http.StatusCreated, comment)
}

// Comments: List comments for a ticket (filters out internal notes for customers)
func (ctrl *TicketController) ListComments(c *gin.Context) {
	ticketID, ok := parseTicketID(c)
	if !ok {
		return
	}

	userRole, _ := c.Get("user_role")

	var comments []models.Comment
	query := ctrl.db.Preload("Author").Where("ticket_id = ?", ticketID).Order("created_at asc")

	// Filter internal notes if user is a customer
	if userRole.(string) == models.RoleCustomer {
		query = query.Where("is_internal = ?", false)
	}

	if err := query.Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list comments"})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// Audit Trail: Get History for a Ticket
func (ctrl *TicketController) GetHistory(c *gin.Context) {
	ticketID, ok := parseTicketID(c)
	if !ok {
		return
	}

	var history []models.TicketHistory
	if err := ctrl.db.Preload("User").Where("ticket_id = ?", ticketID).Order("created_at desc").Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch history"})
		return
	}

	c.JSON(http.StatusOK, history)
}

// Helpers
func parseTicketID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid ticket id"})
		return 0, false
	}
	return uint(id), true
}

func validTicketStatus(status string) bool {
	return status == models.TicketStatusOpen ||
		status == models.TicketStatusInProgress ||
		status == models.TicketStatusResolved
}
