package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"supportdesk/backend/internal/models"
)

type TicketHandler struct {
	db *gorm.DB
}

func NewTicketHandler(db *gorm.DB) *TicketHandler {
	return &TicketHandler{db: db}
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

func (h *TicketHandler) Create(c *gin.Context) {
	var request createTicketRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "subject, description, and category are required"})
		return
	}

	priority := request.Priority
	if priority == "" {
		priority = "normal"
	}

	ticket := models.Ticket{
		Subject:     request.Subject,
		Description: request.Description,
		Category:    request.Category,
		Priority:    priority,
		Status:      models.TicketStatusOpen,
	}
	if err := h.db.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create ticket"})
		return
	}
	c.JSON(http.StatusCreated, ticket)
}

func (h *TicketHandler) List(c *gin.Context) {
	var tickets []models.Ticket
	if err := h.db.Order("id asc").Find(&tickets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list tickets"})
		return
	}
	c.JSON(http.StatusOK, tickets)
}

func (h *TicketHandler) Get(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var ticket models.Ticket
	if err := h.db.First(&ticket, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get ticket"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

func (h *TicketHandler) Update(c *gin.Context) {
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

	result := h.db.Model(&models.Ticket{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update ticket"})
		return
	}
	if result.RowsAffected == 0 {
		var ticket models.Ticket
		if err := h.db.First(&ticket, id).Error; errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get ticket"})
			return
		}
	}

	var ticket models.Ticket
	if err := h.db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get updated ticket"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

func (h *TicketHandler) UpdateStatus(c *gin.Context) {
	id, ok := parseTicketID(c)
	if !ok {
		return
	}

	var request updateTicketStatusRequest
	if err := c.ShouldBindJSON(&request); err != nil || !validTicketStatus(request.Status) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be open, in_progress, or resolved"})
		return
	}

	result := h.db.Model(&models.Ticket{}).Where("id = ?", id).Update("status", request.Status)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update ticket status"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ticket not found"})
		return
	}

	var ticket models.Ticket
	if err := h.db.First(&ticket, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get updated ticket"})
		return
	}
	c.JSON(http.StatusOK, ticket)
}

func parseTicketID(c *gin.Context) (uint, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ticket ID must be a positive integer"})
		return 0, false
	}
	return uint(id), true
}

func validTicketStatus(status string) bool {
	return status == models.TicketStatusOpen ||
		status == models.TicketStatusInProgress ||
		status == models.TicketStatusResolved
}
