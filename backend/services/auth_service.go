package services

import (
	"errors"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"supportdesk/backend/models"
	"supportdesk/backend/repositories"
	"supportdesk/backend/utils"
)

// AuthService contains the business logic for registration, login, and
// current-user retrieval.
type AuthService struct {
	userRepo *repositories.UserRepository
}

// NewAuthService returns a new AuthService backed by the given repository.
func NewAuthService(userRepo *repositories.UserRepository) *AuthService {
	return &AuthService{userRepo: userRepo}
}

// RegisterInput is the data required to create a new account.
type RegisterInput struct {
	Name     string
	Email    string
	Password string
	Role     string
}

// LoginInput is the data required to authenticate.
type LoginInput struct {
	Email    string
	Password string
}

// AuthResponse is returned after a successful register or login.
type AuthResponse struct {
	Token string      `json:"token"`
	User  models.User `json:"user"`
}

// Register creates a new user account after validating uniqueness and
// hashing the password with bcrypt.
func (s *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	// Check if email is already taken.
	existing, err := s.userRepo.FindByEmail(input.Email)
	if err == nil && existing != nil {
		return nil, errors.New("email is already registered")
	}
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, errors.New("could not check existing user")
	}

	// Hash the plaintext password.
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("could not hash password")
	}

	// Default to customer role if none provided.
	role := input.Role
	if role == "" {
		role = models.RoleCustomer
	}
	if role != models.RoleCustomer && role != models.RoleAgent && role != models.RoleAdmin {
		return nil, errors.New("role must be customer, agent, or admin")
	}

	user := &models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hashedPassword),
		Role:     role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, errors.New("could not create user")
	}

	// Issue a JWT so the user is logged in immediately after registration.
	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("could not generate token")
	}

	return &AuthResponse{Token: token, User: *user}, nil
}

// Login authenticates a user by email + password and returns a JWT.
func (s *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, errors.New("could not find user")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	token, err := utils.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, errors.New("could not generate token")
	}

	return &AuthResponse{Token: token, User: *user}, nil
}

// GetCurrentUser retrieves the user record for the given ID (extracted from JWT).
func (s *AuthService) GetCurrentUser(userID uint) (*models.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return user, nil
}
