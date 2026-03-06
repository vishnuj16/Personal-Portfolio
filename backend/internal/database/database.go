package database

import (
	"database/sql"
	"log"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(path string) {
	var err error
	DB, err = sql.Open("sqlite", path+"?_foreign_keys=on&_journal_mode=WAL")
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	migrate()
	log.Println("✅ Database initialized")
}

func migrate() {
	schema := `
	CREATE TABLE IF NOT EXISTS skill_categories (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT    NOT NULL UNIQUE,
		slug       TEXT    NOT NULL UNIQUE,
		image_url  TEXT,
		sort_order INTEGER DEFAULT 0,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS skills (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		category_id INTEGER NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
		name        TEXT    NOT NULL,
		slug        TEXT    NOT NULL UNIQUE,
		image_url   TEXT,
		proficiency INTEGER DEFAULT 0 CHECK(proficiency BETWEEN 0 AND 100),
		years       REAL    DEFAULT 0,
		sort_order  INTEGER DEFAULT 0,
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS projects (
		id           INTEGER PRIMARY KEY AUTOINCREMENT,
		title        TEXT    NOT NULL,
		slug         TEXT    NOT NULL UNIQUE,
		summary      TEXT,
		description  TEXT,
		cover_url    TEXT,
		repo_url     TEXT,
		live_url     TEXT,
		status       TEXT    DEFAULT 'completed' CHECK(status IN ('completed','in-progress','archived')),
		featured     INTEGER DEFAULT 0,
		sort_order   INTEGER DEFAULT 0,
		started_at   DATE,
		ended_at     DATE,
		created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS project_tags (
		project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		tag        TEXT    NOT NULL,
		PRIMARY KEY (project_id, tag)
	);

	CREATE TABLE IF NOT EXISTS project_skills (
		project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		skill_id   INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
		PRIMARY KEY (project_id, skill_id)
	);

	CREATE TABLE IF NOT EXISTS project_images (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		url        TEXT    NOT NULL,
		caption    TEXT,
		sort_order INTEGER DEFAULT 0
	);

	CREATE TABLE IF NOT EXISTS profile (
		id           INTEGER PRIMARY KEY CHECK(id = 1),
		name         TEXT,
		tagline      TEXT,
		bio          TEXT,
		avatar_url   TEXT,
		resume_url   TEXT,
		email        TEXT,
		github_url   TEXT,
		linkedin_url TEXT,
		twitter_url  TEXT,
		website_url  TEXT,
		location     TEXT,
		available    INTEGER DEFAULT 1,
		updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS experiences (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		company     TEXT    NOT NULL,
		role        TEXT    NOT NULL,
		description TEXT,
		logo_url    TEXT,
		company_url TEXT,
		started_at  DATE    NOT NULL,
		ended_at    DATE,
		current     INTEGER DEFAULT 0,
		sort_order  INTEGER DEFAULT 0,
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS education (
		id          INTEGER PRIMARY KEY AUTOINCREMENT,
		institution TEXT    NOT NULL,
		degree      TEXT,
		field       TEXT,
		logo_url    TEXT,
		started_at  DATE,
		ended_at    DATE,
		created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Seed empty profile row if not exists
	INSERT OR IGNORE INTO profile (id, name) VALUES (1, 'Vishnu');
	`

	if _, err := DB.Exec(schema); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}
}
