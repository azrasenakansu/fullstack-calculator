package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculateEndpoint(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantResult float64
		wantCode   string
	}{
		{name: "add", body: `{"operation":"add","operands":[2,3]}`, wantStatus: http.StatusOK, wantResult: 5},
		{name: "subtract", body: `{"operation":"subtract","operands":[10,4]}`, wantStatus: http.StatusOK, wantResult: 6},
		{name: "multiply", body: `{"operation":"multiply","operands":[2.5,-4]}`, wantStatus: http.StatusOK, wantResult: -10},
		{name: "divide", body: `{"operation":"divide","operands":[10,4]}`, wantStatus: http.StatusOK, wantResult: 2.5},
		{name: "zero is a valid operand", body: `{"operation":"multiply","operands":[0,7]}`, wantStatus: http.StatusOK, wantResult: 0},
		{name: "trailing whitespace is allowed", body: "{\"operation\":\"add\",\"operands\":[1,1]}\n", wantStatus: http.StatusOK, wantResult: 2},

		{name: "empty body", body: ``, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "null body", body: `null`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "malformed JSON", body: `{"operation":"add",`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "string operand", body: `{"operation":"add","operands":["1",2]}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "null operand", body: `{"operation":"add","operands":[5,null]}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "operands not an array", body: `{"operation":"add","operands":5}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "trailing JSON value", body: `{"operation":"add","operands":[1,2]}{"operation":"add","operands":[3,4]}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},
		{name: "trailing garbage", body: `{"operation":"add","operands":[1,2]} x`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidJSON},

		{name: "unknown operation", body: `{"operation":"modulo","operands":[1,2]}`, wantStatus: http.StatusBadRequest, wantCode: codeUnknownOperation},
		{name: "missing operation", body: `{"operands":[1,2]}`, wantStatus: http.StatusBadRequest, wantCode: codeUnknownOperation},
		{name: "missing operands", body: `{"operation":"add"}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidOperandCount},
		{name: "too many operands", body: `{"operation":"add","operands":[1,2,3]}`, wantStatus: http.StatusBadRequest, wantCode: codeInvalidOperandCount},
		{name: "division by zero", body: `{"operation":"divide","operands":[1,0]}`, wantStatus: http.StatusBadRequest, wantCode: codeDivisionByZero},
		{name: "overflow", body: `{"operation":"multiply","operands":[1e308,10]}`, wantStatus: http.StatusBadRequest, wantCode: codeResultOutOfRange},
	}

	router := NewRouter()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/calculate", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}

			if tt.wantStatus == http.StatusOK {
				var resp calculateResponse
				decodeBody(t, rec, &resp)
				if resp.Result != tt.wantResult {
					t.Errorf("result = %v, want %v", resp.Result, tt.wantResult)
				}
				return
			}

			var resp errorResponse
			decodeBody(t, rec, &resp)
			if resp.Error.Code != tt.wantCode {
				t.Errorf("error code = %q, want %q", resp.Error.Code, tt.wantCode)
			}
			if resp.Error.Message == "" {
				t.Error("error message is empty")
			}
		})
	}
}

func TestCalculateEndpointRejectsOtherMethods(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/calculate", nil)
	rec := httptest.NewRecorder()

	NewRouter().ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}

func decodeBody(t *testing.T, rec *httptest.ResponseRecorder, v any) {
	t.Helper()
	if err := json.NewDecoder(rec.Body).Decode(v); err != nil {
		t.Fatalf("decoding response body %q: %v", rec.Body, err)
	}
}
