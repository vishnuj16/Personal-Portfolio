package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"portfolio-backend/internal/database"

	"github.com/gin-gonic/gin"
)

var errNothingToUpdate = errors.New("nothing to update")

// execer is satisfied by both *sql.DB and *sql.Tx.
type execer interface {
	Exec(query string, args ...any) (sql.Result, error)
}

// updateRow writes every column in cols to one row of table in a single
// statement (so a request either fully applies or not at all) and bumps
// updated_at. Column names always come from the handler's own field mapping,
// never from the request. Returns sql.ErrNoRows when the row doesn't exist.
func updateRow(db execer, table string, id any, cols map[string]any) error {
	if len(cols) == 0 {
		return errNothingToUpdate
	}
	set := make([]string, 0, len(cols)+1)
	args := make([]any, 0, len(cols)+1)
	for col, val := range cols {
		set = append(set, col+" = ?")
		args = append(args, val)
	}
	set = append(set, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, id)
	res, err := db.Exec("UPDATE "+table+" SET "+strings.Join(set, ", ")+" WHERE id = ?", args...)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// deleteRow removes one row; sql.ErrNoRows when nothing matched.
func deleteRow(table string, id any) error {
	res, err := database.DB.Exec("DELETE FROM "+table+" WHERE id = ?", id)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return sql.ErrNoRows
	}
	return nil
}

// writeErr maps a write error to a response and reports whether it wrote one.
func writeErr(c *gin.Context, err error) bool {
	switch {
	case err == nil:
		return false
	case errors.Is(err, sql.ErrNoRows):
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.Is(err, errNothingToUpdate):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case strings.Contains(err.Error(), "UNIQUE constraint failed"):
		c.JSON(http.StatusConflict, gin.H{"error": "that name or slug is already taken"})
	case strings.Contains(err.Error(), "CHECK constraint failed"), strings.Contains(err.Error(), "FOREIGN KEY constraint failed"):
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid value: " + err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
	return true
}
