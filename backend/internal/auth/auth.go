package auth

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type verifyRequest struct {
	Passkey string `json:"passkey" binding:"required"`
}

// VerifyPasskey checks the passkey and returns a JWT if valid.
func VerifyPasskey(c *gin.Context) {
	var req verifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "passkey is required"})
		return
	}

	expected := os.Getenv("ADMIN_PASSKEY")
	if expected == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server misconfigured: ADMIN_PASSKEY not set"})
		return
	}

	if req.Passkey != expected {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong passkey"})
		return
	}

	token, err := issueToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"expires_in": 86400, // 24 hours in seconds
	})
}

func issueToken() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	claims := jwt.MapClaims{
		"sub": "vishnu",
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(24 * time.Hour).Unix(),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

// ParseToken validates and returns claims from a JWT string.
func ParseToken(tokenStr string) (jwt.MapClaims, error) {
	secret := os.Getenv("JWT_SECRET")
	t, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(secret), nil
	})
	if err != nil || !t.Valid {
		return nil, err
	}
	return t.Claims.(jwt.MapClaims), nil
}
