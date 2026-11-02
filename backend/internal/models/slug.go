package models

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var nonAlphanumeric = regexp.MustCompile(`[^a-z0-9]+`)

func Slugify(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	s = nonAlphanumeric.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		// e.g. a title in a non-Latin script: keep slugs unique and non-empty
		s = "item-" + strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return s
}
