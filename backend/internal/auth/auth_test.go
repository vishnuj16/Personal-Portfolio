package auth

import (
	"testing"
	"time"
)

func TestPasskeyMatches(t *testing.T) {
	if !passkeyMatches("secret", "secret") {
		t.Fatal("same passkey should match")
	}
	for _, wrong := range []string{"", "secre", "secret ", "SECRET"} {
		if passkeyMatches(wrong, "secret") {
			t.Fatalf("%q should not match", wrong)
		}
	}
}

func TestLimiterLocksOutAfterMaxAttempts(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l := newLimiter()
	l.now = func() time.Time { return now }

	for i := 0; i < maxAttempts-1; i++ {
		l.fail("1.2.3.4")
		if l.retryAfter("1.2.3.4") != 0 {
			t.Fatalf("locked out after only %d failures", i+1)
		}
	}
	l.fail("1.2.3.4")
	if got := l.retryAfter("1.2.3.4"); got != baseLockout {
		t.Fatalf("want lockout %v, got %v", baseLockout, got)
	}
	if l.retryAfter("5.6.7.8") != 0 {
		t.Fatal("other IPs must not be affected")
	}

	// Lock expires; a second round of failures locks out for twice as long
	now = now.Add(baseLockout + time.Second)
	if l.retryAfter("1.2.3.4") != 0 {
		t.Fatal("lockout should have expired")
	}
	for i := 0; i < maxAttempts; i++ {
		l.fail("1.2.3.4")
	}
	if got := l.retryAfter("1.2.3.4"); got != 2*baseLockout {
		t.Fatalf("want escalated lockout %v, got %v", 2*baseLockout, got)
	}
}

func TestLimiterSuccessResets(t *testing.T) {
	l := newLimiter()
	for i := 0; i < maxAttempts-1; i++ {
		l.fail("1.2.3.4")
	}
	l.succeed("1.2.3.4")
	l.fail("1.2.3.4")
	if l.retryAfter("1.2.3.4") != 0 {
		t.Fatal("a successful login should clear earlier failures")
	}
}

func TestFailuresOutsideWindowDontAccumulate(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	l := newLimiter()
	l.now = func() time.Time { return now }
	for i := 0; i < maxAttempts-1; i++ {
		l.fail("1.2.3.4")
	}
	now = now.Add(window + time.Minute)
	l.fail("1.2.3.4")
	if l.retryAfter("1.2.3.4") != 0 {
		t.Fatal("old failures should have aged out of the window")
	}
}
