package api

import (
	"encoding/json"
	"log"
	"net/http"
)

// Machine-readable error codes returned in error responses.
const (
	codeInvalidJSON         = "invalid_json"
	codeUnknownOperation    = "unknown_operation"
	codeInvalidOperandCount = "invalid_operand_count"
	codeDivisionByZero      = "division_by_zero"
	codeResultOutOfRange    = "result_out_of_range"
	codeUndefinedResult     = "undefined_result"
	codeInternalError       = "internal_error"
)

type calculateResponse struct {
	Result float64 `json:"result"`
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		// Headers are already sent; all we can do is record the failure.
		log.Printf("writing response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}
