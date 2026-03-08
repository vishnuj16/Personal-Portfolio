package models

import "time"

type SkillCategory struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	ImageURL  *string   `json:"image_url"`
	SortOrder int       `json:"sort_order"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Skills    []Skill   `json:"skills,omitempty"`
}

type Skill struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	ImageURL    *string   `json:"image_url"`
	Proficiency int       `json:"proficiency"` // 0-100
	Years       float64   `json:"years"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Project struct {
	ID          int64          `json:"id"`
	Title       string         `json:"title"`
	Slug        string         `json:"slug"`
	Summary     *string        `json:"summary"`
	Description *string        `json:"description"`
	CoverURL    *string        `json:"cover_url"`
	RepoURL     *string        `json:"repo_url"`
	LiveURL     *string        `json:"live_url"`
	Status      string         `json:"status"`
	Featured    bool           `json:"featured"`
	SortOrder   int            `json:"sort_order"`
	StartedAt   *string        `json:"started_at"`
	EndedAt     *string        `json:"ended_at"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	Skills      []Skill        `json:"skills,omitempty"`
	Images      []ProjectImage `json:"images,omitempty"`
}

type ProjectImage struct {
	ID        int64   `json:"id"`
	ProjectID int64   `json:"project_id"`
	URL       string  `json:"url"`
	Caption   *string `json:"caption"`
	SortOrder int     `json:"sort_order"`
}

type Profile struct {
	ID          int64     `json:"id"`
	Name        *string   `json:"name"`
	Tagline     *string   `json:"tagline"`
	Bio         *string   `json:"bio"`
	AvatarURL   *string   `json:"avatar_url"`
	ResumeURL   *string   `json:"resume_url"`
	Email       *string   `json:"email"`
	GithubURL   *string   `json:"github_url"`
	LinkedinURL *string   `json:"linkedin_url"`
	TwitterURL  *string   `json:"twitter_url"`
	WebsiteURL  *string   `json:"website_url"`
	Location    *string   `json:"location"`
	Available   bool      `json:"available"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Experience struct {
	ID          int64     `json:"id"`
	Company     string    `json:"company"`
	Role        string    `json:"role"`
	Description *string   `json:"description"`
	LogoURL     *string   `json:"logo_url"`
	CompanyURL  *string   `json:"company_url"`
	StartedAt   string    `json:"started_at"`
	EndedAt     *string   `json:"ended_at"`
	Current     bool      `json:"current"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Education struct {
	ID          int64     `json:"id"`
	Institution string    `json:"institution"`
	Degree      *string   `json:"degree"`
	Field       *string   `json:"field"`
	LogoURL     *string   `json:"logo_url"`
	StartedAt   *string   `json:"started_at"`
	EndedAt     *string   `json:"ended_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
