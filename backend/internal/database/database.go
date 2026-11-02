package database

import (
	"database/sql"
	"log"
	"strings"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func Init(path string) {
	var err error
	// modernc.org/sqlite only honours _pragma=… params; they run on every new connection.
	DB, err = sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
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

	CREATE TABLE IF NOT EXISTS project_skills (
		project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		skill_id   INTEGER NOT NULL REFERENCES skills(id)   ON DELETE CASCADE,
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
		dev_bio      TEXT,
		author_bio   TEXT,
		avatar_url   TEXT,
		resume_url   TEXT,
		email        TEXT,
		phone        TEXT,
		github_url   TEXT,
		linkedin_url TEXT,
		twitter_url  TEXT,
		website_url  TEXT,
		location     TEXT,
		available      INTEGER DEFAULT 1,
		author_tagline TEXT,
		updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
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

	CREATE TABLE IF NOT EXISTS books (
		id             INTEGER PRIMARY KEY AUTOINCREMENT,
		title          TEXT    NOT NULL,
		slug           TEXT    NOT NULL UNIQUE,
		subtitle       TEXT,
		description    TEXT,
		cover_url      TEXT,
		genre          TEXT,
		book_type      TEXT    NOT NULL DEFAULT 'novel' CHECK(book_type IN ('novel','novella','short story','collection','non-fiction','poetry')),
		published      INTEGER DEFAULT 0,
		self_published INTEGER DEFAULT 0,
		publisher      TEXT,
		published_at   DATE,
		amazon_url     TEXT,
		goodreads_url  TEXT,
		other_buy_url  TEXT,
		pages          INTEGER,
		isbn           TEXT,
		featured       INTEGER DEFAULT 0,
		new_release    INTEGER DEFAULT 0,
		coming_soon    INTEGER DEFAULT 0,
		estimated_release TEXT,
		theme_color    TEXT,
		sort_order     INTEGER DEFAULT 0,
		created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
	);

	-- Drop legacy tags table if it still exists (idempotent migration)
	DROP TABLE IF EXISTS project_tags;

	-- Seed empty profile row if not exists
	INSERT OR IGNORE INTO profile (id, name) VALUES (1, 'Vishnu');
	`

	if _, err := DB.Exec(schema); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	// Idempotent column additions — SQLite doesn't support ADD COLUMN IF NOT EXISTS,
	// so we attempt the ALTER and ignore "duplicate column name" errors silently.
	columnMigrations := []string{
		"ALTER TABLE profile ADD COLUMN phone TEXT",
		"ALTER TABLE profile ADD COLUMN author_tagline TEXT",
		"ALTER TABLE profile ADD COLUMN dev_bio TEXT",
		// Announcements table
		`CREATE TABLE IF NOT EXISTS announcements (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT    NOT NULL DEFAULT '',
			body       TEXT    NOT NULL DEFAULT '',
			pinned     INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		"ALTER TABLE profile ADD COLUMN author_bio TEXT",
		"ALTER TABLE books ADD COLUMN theme_color TEXT",
		"ALTER TABLE books ADD COLUMN coming_soon INTEGER DEFAULT 0",
		"ALTER TABLE books ADD COLUMN estimated_release TEXT",
		"ALTER TABLE books ADD COLUMN opening_line TEXT",
		// Curated reviews / praise shown on the book page
		`CREATE TABLE IF NOT EXISTS book_reviews (
			id             INTEGER PRIMARY KEY AUTOINCREMENT,
			book_id        INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
			quote          TEXT    NOT NULL,
			reviewer       TEXT,
			reviewer_title TEXT,
			source         TEXT    NOT NULL DEFAULT 'other' CHECK(source IN ('amazon','goodreads','press','author','other')),
			source_url     TEXT,
			rating         INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
			starred        INTEGER NOT NULL DEFAULT 0,
			sort_order     INTEGER NOT NULL DEFAULT 0,
			created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,
		"CREATE INDEX IF NOT EXISTS idx_book_reviews_book ON book_reviews(book_id, sort_order)",
	}
	for _, stmt := range columnMigrations {
		if _, err := DB.Exec(stmt); err != nil {
			// "duplicate column name" means the column already exists — safe to ignore
			if !strings.Contains(err.Error(), "duplicate column name") {
				log.Fatalf("Column migration failed: %v", err)
			}
		}
	}

	// Foreign keys were silently off before (wrong DSN syntax), so deletes left
	// rows pointing at parents that no longer exist. Remove them; on a clean
	// database these match nothing.
	orphanCleanup := []string{
		`DELETE FROM skills WHERE category_id NOT IN (SELECT id FROM skill_categories)`,
		`DELETE FROM project_skills WHERE project_id NOT IN (SELECT id FROM projects) OR skill_id NOT IN (SELECT id FROM skills)`,
		`DELETE FROM project_images WHERE project_id NOT IN (SELECT id FROM projects)`,
		`DELETE FROM book_reviews WHERE book_id NOT IN (SELECT id FROM books)`,
	}
	for _, stmt := range orphanCleanup {
		res, err := DB.Exec(stmt)
		if err != nil {
			log.Fatalf("Orphan cleanup failed: %v", err)
		}
		if n, _ := res.RowsAffected(); n > 0 {
			log.Printf("Removed %d orphaned row(s): %s", n, strings.Fields(stmt)[2])
		}
	}
}
