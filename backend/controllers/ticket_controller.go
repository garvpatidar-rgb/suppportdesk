package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"supportdesk/backend/models"
)

// TicketController handles HTTP requests for ticket endpoints.
// This still accesses the DB directly; we will refactor it to use
// a service + repository layer in Phase 3.
type TicketController struct {
	db *gorm.DB
}

// NewTicketController returns a new TicketController backed by the given DB.
func NewTicketController(db *gorm.DB) *TicketController {
	return &TicketController{db: db}
}

type createTicketRequest struct {
	Subject     string `json:"subject" binding:"required"`
	Description string `json:"description" binding:"required"`
	Category    string `json:"category" binding:"required"`
	Priority    string `json:"priority"`
}

type updateTicketStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

type updateTicketRequest struct {
	Subject     *string `json:"subject"`
	Description *string `json:"description"`
	Category    *string `json:"category"`
	Priority    *string `json:"priority"`
}

// Create handles POST /api/v1/tickets.
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

	// Get the authenticated user's ID from the JWT context.
	customerID, _ := c.Get("user_id")

	ticket := models.Ticket{
		Subject:     request.Subject,
		Description: request.Description,
		Category:    request.Category,
		Priority:    priority,
		Status:      models.TicketStatusOpen,
		CustomerID:  customerID.(uint),
	}
	if err := ctrl.db.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create ticket"})
		return
	}
	c.JSON(http.StatusCreated, ticket)
}

// List handles GET /api/v1/tickets.
func (ctrl *TicketController) List(c *gin.Context) {
	var tickets []models.Ticket

	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")

	query := ctrl.db.Order("id asc")

	// Customers see only their own tickets; agents and admins see all.
	if userRole.(string) == models.RoleCustomer {
		query = query.Where("customer_id = ?", userID.(uint))
	}

	if err := query.Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list tickets"})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

// Search handles GET /api/v1/tickets/search with pagination and filters.
func (ctrl *TicketController) Search(c *gin.Context) {
	page, err := parseQueryInt(c, "page", 1, 1_000_000)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "page must be a positive integer no greater than 1000000"})
		return
	}
	limit, err := parseQueryInt(c, "limit", 20, 100)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "limit must be a positive integer no greater than 100"})
		return
	}

	query := ctrl.db.Model(&models.Ticket{})

	// Customers can only search their own tickets.
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	if userRole.(string) == models.RoleCustomer {
		query = query.Where("customer_id = ?", userID.(uint))
	}

	if status := c.Query("status"); status != "" {
		if !validTicketStatus(status) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "status must be open, in_progress, or resolved"})
			return
		}
		query = query.Where("status = ?", status)
	}
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}
	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if search := c.Query("q"); search != "" {
		pattern := "%" + search + "%"
		query = query.Where("subject ILIKE ? OR description ILIKE ?", pattern, pattern)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not count matching tickets"})
		return
	}

	tickets := make([]models.Ticket, 0)
	offset := (page - 1) * limit
	if err := query.Order("created_at desc").Order("id desc").Limit(limit).Offset(offset).Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not search tickets"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"tickets": tickets,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// Get handles GET /api/v1/tickets/:id.
func (ctrl *TicketController) Get(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var ticket models.Ticket
	if err := ctrl.db.First(&ticket, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get ticket"})
		return
	}

	// Customers can only view their own tickets.
	userRole, _ := c.Get("user_role")
	userID, _ := c.Get("user_id")
	if userRole.(string) == models.RoleCustomer && ticket.CustomerID != userID.(uint) {
		c.JSON(http.StatusForbidden, gin.H{"error": "you do not have permission to view this ticket"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// Update handles PATCH /api/v1/tickets/:id.
func (ctrl *TicketController) Update(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var request updateTicketRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "request body must be valid JSON"})
		return
	}

	updates := make(map[string]interface{})
	if request.Subject != nil {
		if *request.Subject == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "subject cannot be empty"})
			return
		}
		updates["subject"] = *request.Subject
	}
	if request.Description != nil {
		if *request.Description == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "description cannot be empty"})
			return
		}
		updates["description"] = *request.Description
	}
	if request.Category != nil {
		if *request.Category == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "category cannot be empty"})
			return
		}
		updates["category"] = *request.Category
	}
	if request.Priority != nil {
		if *request.Priority == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "priority cannot be empty"})
			return
		}
		updates["priority"] = *request.Priority
	}
	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provide at least one field to update"})
		return
	}

	result := ctrl.db.Model(&models.Ticket{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update ticket"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
		return
	}

	var ticket models.Ticket
	if err := ctrl.db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get updated ticket"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

// UpdateStatus handles PATCH /api/v1/tickets/:id/status.
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

	result := ctrl.db.Model(&models.Ticket{}).Where("id = ?", id).Update("status", request.Status)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update ticket status"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
		return
	}

	var ticket models.Ticket
	if err := ctrl.db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get updated ticket"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

// ── Helpers ──────────────────────────────────────────────────────────

func parseTicketID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ticket ID must be a positive integer"})
		return 0, false
	}
	return uint(id), true
}

func parseQueryInt(c *gin.Context, name string, defaultValue, maxValue int) (int, error) {
	value := c.Query(name)
	if value == "" {
		return defaultValue, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil || parsed < 1 || parsed > maxValue {
		return 0, strconv.ErrSyntax
	}
	return parsed, nil
}

func validTicketStatus(status string) bool {
	return status == models.TicketStatusOpen ||
		status == models.TicketStatusInProgress ||
		status == models.TicketStatusResolved
}
