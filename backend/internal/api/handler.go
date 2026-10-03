// Package api exposes the calculator over HTTP.
package api

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"

	"github.com/azrasenakansu/fullstack-calculator/backend/internal/calc"
)

// calculateRequest uses pointers so that explicit null operands can be told apart from zero.
type calculateRequest struct {
	Operation string     `json:"operation"`
	Operands  []*float64 `json:"operands"`
}

// NewRouter returns the HTTP handler for the calculator API.
func NewRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", handleCalculate)
	return mux
}

func handleCalculate(w http.ResponseWriter, r *http.Request) {
	operation, operands, err := decodeRequest(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, codeInvalidJSON, err.Error())
		return
	}

	result, err := calc.Calculate(operation, operands)
	if err != nil {
		status, code := errorStatus(err)
		message := err.Error()
		if status == http.StatusInternalServerError {
			log.Printf("calculate: %v", err)
			message = "internal server error"
		}
		writeError(w, status, code, message)
		return
	}

	writeJSON(w, http.StatusOK, calculateResponse{Result: result})
}

// decodeRequest parses a body containing exactly one JSON object and converts
// its operands to plain floats, rejecting null entries.
func decodeRequest(body io.Reader) (string, []float64, error) {
	dec := json.NewDecoder(body)

	// Decoding into a pointer leaves it nil for a top-level JSON null.
	var req *calculateRequest
	if err := dec.Decode(&req); err != nil || req == nil {
		return "", nil, errors.New("request body must be a JSON object with an operation and numeric operands")
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return "", nil, errors.New("request body must contain a single JSON object")
	}

	var operands []float64
	for _, o := range req.Operands {
		if o == nil {
			return "", nil, errors.New("operands must be numbers, not null")
		}
		operands = append(operands, *o)
	}
	return req.Operation, operands, nil
}

// errorStatus maps domain errors to an HTTP status and error code.
func errorStatus(err error) (int, string) {
	switch {
	case errors.Is(err, calc.ErrUnknownOperation):
		return http.StatusBadRequest, codeUnknownOperation
	case errors.Is(err, calc.ErrOperandCount):
		return http.StatusBadRequest, codeInvalidOperandCount
	case errors.Is(err, calc.ErrDivisionByZero):
		return http.StatusBadRequest, codeDivisionByZero
	case errors.Is(err, calc.ErrNonFiniteResult):
		return http.StatusBadRequest, codeResultOutOfRange
	default:
		return http.StatusInternalServerError, codeInternalError
	}
}
