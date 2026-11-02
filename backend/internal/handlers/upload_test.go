package handlers

import "testing"

func TestInsideUploads(t *testing.T) {
	ok := []string{"/uploads/skills/x.png", "uploads/books/a b.jpg", "/uploads/misc/../skills/y.svg"}
	bad := []string{
		"/uploads", "/uploads/", "uploads.db", "/uploads/../portfolio.db",
		"/uploads-backup/x.png", "/../../etc/passwd", "//etc/passwd", "/etc/passwd",
	}
	for _, p := range ok {
		if _, inside := insideUploads(p); !inside {
			t.Errorf("%q should be allowed", p)
		}
	}
	for _, p := range bad {
		if _, inside := insideUploads(p); inside {
			t.Errorf("%q must be rejected", p)
		}
	}
}

func TestReviewInputValidation(t *testing.T) {
	str := func(s string) *string { return &s }
	num := func(n int) *int { return &n }
	cases := []struct {
		name string
		in   reviewInput
		ok   bool
	}{
		{"valid", reviewInput{Quote: str("Great"), Source: str("amazon"), Rating: num(5), SourceURL: str("https://amazon.in/x")}, true},
		{"blank quote", reviewInput{Quote: str("   ")}, false},
		{"bad source", reviewInput{Quote: str("x"), Source: str("blog")}, false},
		{"rating too high", reviewInput{Quote: str("x"), Rating: num(6)}, false},
		{"javascript url", reviewInput{Quote: str("x"), SourceURL: str("javascript:alert(1)")}, false},
		{"empty url clears", reviewInput{SourceURL: str("")}, true},
	}
	for _, tc := range cases {
		_, err := tc.in.columns()
		if (err == nil) != tc.ok {
			t.Errorf("%s: ok=%v, err=%v", tc.name, tc.ok, err)
		}
	}
}

func TestStripMarkupAndTruncate(t *testing.T) {
	got := stripMarkup("**Bold** and _it_ with [a link](https://x.y)\n# Heading")
	if got != "Bold and it with a link Heading" {
		t.Errorf("stripMarkup = %q", got)
	}
	if got := truncate("one two three four", 9); got != "one two…" {
		t.Errorf("truncate = %q", got)
	}
}
