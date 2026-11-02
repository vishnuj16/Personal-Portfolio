# Vishnu's Portfolio — Backend

Go + Gin + SQLite backend for a personal portfolio site with a secret admin mode.

## Stack

| Layer | Technology |
|---|---|
| Language | Go 1.25 |
| Router | [Gin](https://github.com/gin-gonic/gin) |
| Database | SQLite via `modernc.org/sqlite` (pure Go; WAL + foreign keys on) |
| Auth | JWT (HS256) via `golang-jwt/jwt` |
| CORS | `gin-contrib/cors` |
| Config | `.env` via `godotenv` |

---

## Quick Start

```bash
# 1. Clone & enter
cd vishnu-portfolio

# 2. Install dependencies
go mod tidy

# 3. Configure secrets
cp .env.example .env
# Edit .env — set ADMIN_PASSKEY and JWT_SECRET

# 4. Run
make dev
```

The server starts at `http://localhost:8080`.

---

## Auth Flow (the "Are you Vishnu?" feature)

```
Frontend shows secret meme button
  → User clicks → passkey popup appears
  → POST /api/auth/verify  { "passkey": "..." }
  → Server returns { "token": "<JWT>", "expires_in": 86400 }
  → Frontend stores token in memory (or sessionStorage)
  → All admin requests: Authorization: Bearer <token>
  → Edit UI becomes visible
```

The JWT expires in **24 hours**. Refresh the page to re-authenticate.

---

## API Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/verify` | Verify passkey → get JWT |

### Public (no auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/profile` | Get your profile info |
| GET | `/api/categories` | List skill categories (with embedded skills) |
| GET | `/api/skills` | List all skills (filter: `?category_id=N`) |
| GET | `/api/projects` | List projects (filter: `?status=&featured=true`) |
| GET | `/api/projects/:slug` | Single project with images, tags, skills |
| GET | `/api/experiences` | Work history |
| GET | `/api/education` | Education history |

### Admin (Bearer JWT required)
| Method | Path | Description |
|---|---|---|
| PATCH | `/api/admin/profile` | Update any profile field |
| POST | `/api/admin/categories` | Create skill category |
| PATCH | `/api/admin/categories/:id` | Update category |
| DELETE | `/api/admin/categories/:id` | Delete category (cascades skills) |
| POST | `/api/admin/skills` | Create skill |
| PATCH | `/api/admin/skills/:id` | Update skill |
| DELETE | `/api/admin/skills/:id` | Delete skill |
| POST | `/api/admin/projects` | Create project |
| PATCH | `/api/admin/projects/:id` | Update project |
| DELETE | `/api/admin/projects/:id` | Delete project |
| POST | `/api/admin/projects/:id/images` | Add image to project |
| DELETE | `/api/admin/projects/images/:imageId` | Remove project image |
| POST | `/api/admin/experiences` | Add work experience |
| PATCH | `/api/admin/experiences/:id` | Update experience |
| DELETE | `/api/admin/experiences/:id` | Delete experience |
| POST | `/api/admin/education` | Add education entry |
| PATCH | `/api/admin/education/:id` | Update education |
| DELETE | `/api/admin/education/:id` | Delete education |
| POST | `/api/admin/upload` | Upload image file |
| DELETE | `/api/admin/upload` | Delete uploaded file |
| POST | `/api/admin/books/:id/reviews` | Add a review to a book |
| POST | `/api/admin/books/:id/reviews/reorder` | Reorder a book's reviews (`{ "ids": [...] }`) |
| PATCH | `/api/admin/reviews/:id` | Update a review |
| DELETE | `/api/admin/reviews/:id` | Delete a review |

`GET /api/books/:slug` includes the book's `reviews`. The passkey endpoint is
rate-limited per client IP (5 wrong attempts → escalating lockout, `429` + `Retry-After`).

### Link previews

Non-API routes serve the frontend's `index.html` with per-page Open Graph /
Twitter tags injected server-side (`/book/:slug` uses the book's title, top
review and cover).

---

## File Uploads

`POST /api/admin/upload` accepts `multipart/form-data`:

| Field | Type | Description |
|---|---|---|
| `file` | File | Image (jpg, jpeg, png, webp, svg, gif, max 5MB) |
| `bucket` | String | One of `books`, `profile`, `avatars`, `projects`, `skills`, `categories`, `experiences`, `education`, `misc` (anything else is rejected) |

Returns:
```json
{ "url": "/uploads/skills/1712345678.png", "filename": "...", "bucket": "skills" }
```

Store the returned `url` as `image_url` in your skill/category/project.

Uploaded files are served statically at `GET /uploads/**`, with a sandboxing
`Content-Security-Policy` so an uploaded SVG can't run script.

---

## Data Models

### Skill Category
```json
{
  "id": 1,
  "name": "Frontend",
  "slug": "frontend",
  "image_url": "/uploads/categories/frontend.svg",
  "sort_order": 0,
  "skills": [ ... ]
}
```

### Skill
```json
{
  "id": 1,
  "category_id": 1,
  "name": "React",
  "slug": "react",
  "image_url": "/uploads/skills/react.svg",
  "proficiency": 90,
  "years": 4.5,
  "sort_order": 0
}
```

### Project
```json
{
  "id": 1,
  "title": "My App",
  "slug": "my-app",
  "summary": "Short description",
  "description": "Long markdown content",
  "cover_url": "/uploads/projects/cover.png",
  "repo_url": "https://github.com/...",
  "live_url": "https://myapp.com",
  "status": "completed",
  "featured": true,
  "tags": ["saas", "typescript"],
  "skills": [ ... ],
  "images": [ ... ],
  "started_at": "2024-01",
  "ended_at": "2024-06"
}
```

---

## Directory Structure

```
.
├── cmd/
│   └── main.go              # Entry point, router setup
├── internal/
│   ├── auth/
│   │   └── auth.go          # Passkey verify (rate-limited) + JWT issue/parse
│   ├── database/
│   │   └── database.go      # SQLite init + migrations
│   ├── handlers/
│   │   ├── skills.go        # Categories + Skills CRUD
│   │   ├── projects.go      # Projects CRUD
│   │   ├── profile.go       # Profile / Experience / Education
│   │   ├── books_handler.go # Books CRUD, featured / new release
│   │   ├── reviews_handler.go # Book reviews
│   │   ├── announcements_handler.go
│   │   ├── meta.go          # index.html + link-preview tags
│   │   ├── update.go        # Shared single-statement update / error mapping
│   │   └── upload.go        # Image upload/delete
│   ├── middleware/
│   │   └── auth.go          # JWT guard middleware
│   └── models/
│       ├── models.go        # All struct definitions
│       └── slug.go          # Slug generator
├── uploads/                 # Served statically
├── .env.example
├── Makefile
├── go.mod
└── README.md
```

---

## Production Notes

- Set `GIN_MODE=release` in your environment
- Serve behind a reverse proxy (nginx/caddy) with HTTPS
- Back up `portfolio.db` regularly — it's your entire site content
- Set `FRONTEND_ORIGIN` to your actual domain
- Set `SITE_URL` (e.g. `https://byvishnu.in`) so link previews use absolute URLs
- Behind a reverse proxy, set `TRUSTED_PROXIES` to the proxy's address so the
  login rate limit sees real client IPs (otherwise everyone shares one limit)
- SQLite runs in WAL mode: back up `portfolio.db` together with `portfolio.db-wal`
  (or use `sqlite3 portfolio.db ".backup out.db"`)
- `go test ./...` covers the login limiter, upload path checks and review validation
