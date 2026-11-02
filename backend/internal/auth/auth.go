package auth

import (
	"crypto/sha256"
	"database/sql"
	"crypto/subtle"
	"fmt"
	"math"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"portfolio-backend/internal/database"
)

type verifyRequest struct {
	Passkey string `json:"passkey" binding:"required"`
}

// ─── Brute-force protection ──────────────────────────────────────────────────
// Each client IP gets a few attempts per window; going over locks it out, and
// repeated lockouts double in length (capped).

const (
	maxAttempts = 5
	window      = 15 * time.Minute
	baseLockout = 15 * time.Minute
	maxLockout  = 24 * time.Hour
)

type attemptState struct {
	failures    int
	windowStart time.Time
	lockedUntil time.Time
	lockouts    int
}

type limiter struct {
	mu    sync.Mutex
	byIP  map[string]*attemptState
	now   func() time.Time
	clean time.Time
}

func newLimiter() *limiter {
	return &limiter{byIP: map[string]*attemptState{}, now: time.Now}
}

var loginLimiter = newLimiter()

// retryAfter reports how long ip must wait; zero means it may try now.
func (l *limiter) retryAfter(ip string) time.Duration {
	l.mu.Lock()
	defer l.mu.Unlock()
	if st, ok := l.byIP[ip]; ok && l.now().Before(st.lockedUntil) {
		return st.lockedUntil.Sub(l.now())
	}
	return 0
}

func (l *limiter) fail(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	l.sweep(now)
	st, ok := l.byIP[ip]
	if !ok || now.Sub(st.windowStart) > window {
		lockouts := 0
		if ok {
			lockouts = st.lockouts
		}
		st = &attemptState{windowStart: now, lockouts: lockouts}
		l.byIP[ip] = st
	}
	st.failures++
	if st.failures >= maxAttempts {
		lock := time.Duration(float64(baseLockout) * math.Pow(2, float64(st.lockouts)))
		if lock > maxLockout {
			lock = maxLockout
		}
		st.lockedUntil = now.Add(lock)
		st.lockouts++
		st.failures = 0
		st.windowStart = now
	}
}

func (l *limiter) succeed(ip string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.byIP, ip)
}

// sweep drops stale entries now and then so the map can't grow without bound.
func (l *limiter) sweep(now time.Time) {
	if now.Sub(l.clean) < time.Hour {
		return
	}
	l.clean = now
	for ip, st := range l.byIP {
		if now.After(st.lockedUntil) && now.Sub(st.windowStart) > window {
			delete(l.byIP, ip)
		}
	}
}

// passkeyMatches compares in constant time (hashing first so length doesn't leak).
func passkeyMatches(given, expected string) bool {
	g := sha256.Sum256([]byte(given))
	e := sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(g[:], e[:]) == 1
}

// VerifyPasskey checks the passkey and returns a JWT if valid.
func VerifyPasskey(c *gin.Context) {
	ip := c.ClientIP()
	if wait := loginLimiter.retryAfter(ip); wait > 0 {
		c.Header("Retry-After", fmt.Sprintf("%d", int(math.Ceil(wait.Seconds()))))
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "too many attempts — try again later"})
		return
	}

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

	if !passkeyMatches(req.Passkey, expected) {
		loginLimiter.fail(ip)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "wrong passkey"})
		return
	}
	loginLimiter.succeed(ip)

	token, err := issueToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	// The admin banner greets by name; fall back to a neutral label
	name := "admin"
	var profileName sql.NullString
	if database.DB != nil && database.DB.QueryRow(`SELECT name FROM profile WHERE id = 1`).Scan(&profileName) == nil && profileName.String != "" {
		name = profileName.String
	}

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"name":       name,
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
	if err != nil {
		return nil, err
	}
	if !t.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return t.Claims.(jwt.MapClaims), nil
}
