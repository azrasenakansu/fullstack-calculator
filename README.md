# Full-Stack Calculator

A calculator with a **React + TypeScript** frontend and a **Go** REST backend. All calculator operations are performed by the backend API; the frontend only validates input and formats results for display.

Supported operations: addition, subtraction, multiplication and division.

## Tech stack

| Layer    | Technology                                                                    |
| -------- | ----------------------------------------------------------------------------- |
| Backend  | Go 1.22+, standard library only (`net/http`, `encoding/json`), no third-party dependencies |
| Frontend | React 19, TypeScript, Vite, plain CSS                                         |
| Tests    | Go `testing` + `net/http/httptest`; Vitest + React Testing Library + jsdom    |
| Lint     | `go vet`, `gofmt`; oxlint                                                     |

## Project structure

```
backend/
├── cmd/server/main.go          # Entry point: reads PORT, starts the HTTP server
└── internal/
    ├── calc/                   # Domain logic: operations, arity, math errors (no HTTP)
    └── api/                    # HTTP layer: routing, JSON decoding, error → status mapping
frontend/
├── vite.config.ts              # Dev proxy (/api → :8080) and test/coverage config
└── src/
    ├── api/calculator.ts       # Typed API client
    ├── lib/number.ts           # Input parsing and result formatting
    ├── components/CalculatorForm.tsx
    ├── operations.ts           # Operations shown in the UI
    └── App.tsx
```

## Getting started

### Prerequisites

- **Go 1.22+**
- **Node.js 22 or 24 LTS** (with npm)

### Clone the repository

```bash
git clone https://github.com/azrasenakansu/fullstack-calculator.git
cd fullstack-calculator
```

### Run the backend

```bash
cd backend
go run ./cmd/server
```

The API listens on `http://localhost:8080`. Set `PORT` to change it. The frontend dev proxy expects port 8080.

### Run the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. During development, Vite proxies every `/api` request to `http://localhost:8080`, so the frontend and backend share an origin and no CORS configuration is needed.

## API

### `POST /api/v1/calculate`

**Request**

```json
{ "operation": "divide", "operands": [10, 4] }
```

| Field       | Type       | Description                                          |
| ----------- | ---------- | ---------------------------------------------------- |
| `operation` | `string`   | One of the supported operations below                |
| `operands`  | `number[]` | Finite JSON numbers, in order. `null` is not allowed |

**Success response:** `200 OK`

```json
{ "result": 2.5 }
```

**Error response:** `400` or `500`

```json
{ "error": { "code": "division_by_zero", "message": "division by zero" } }
```

`code` is stable and meant for programs. `message` is meant for people.

### Supported operations

| `operation` | Operands | Result    |
| ----------- | -------- | --------- |
| `add`       | `[a, b]` | `a + b`   |
| `subtract`  | `[a, b]` | `a - b`   |
| `multiply`  | `[a, b]` | `a × b`   |
| `divide`    | `[a, b]` | `a ÷ b`   |

### Error codes

| Code                    | Status | When                                                                                   |
| ----------------------- | ------ | -------------------------------------------------------------------------------------- |
| `invalid_json`          | 400    | Body is empty, malformed, `null`, has wrong types, has `null` operands, or contains more than one JSON value |
| `unknown_operation`     | 400    | `operation` is missing or not supported                                                |
| `invalid_operand_count` | 400    | Wrong number of operands for the operation                                             |
| `division_by_zero`      | 400    | Divisor is `0`                                                                         |
| `result_out_of_range`   | 400    | Result overflows to ±Infinity or is NaN                                                |
| `internal_error`        | 500    | Unexpected server error                                                                |

Responses from the router itself, such as `405 Method Not Allowed` for `GET /api/v1/calculate` or `404` for unknown paths, are Go's default plain-text responses.

### curl examples

```bash
# Success. Expected: 200 OK
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","operands":[10,4]}'
```

```json
{"result":2.5}
```

```bash
# Division by zero. Expected: 400 Bad Request
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"divide","operands":[1,0]}'
```

```json
{"error":{"code":"division_by_zero","message":"division by zero"}}
```

```bash
# Wrong number of operands. Expected: 400 Bad Request
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add","operands":[1]}'
```

```json
{"error":{"code":"invalid_operand_count","message":"invalid number of operands: add expects 2, got 1"}}
```

```bash
# Unsupported operation. Expected: 400 Bad Request
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"modulo","operands":[1,2]}'
```

```json
{"error":{"code":"unknown_operation","message":"unknown operation: \"modulo\""}}
```

```bash
# Malformed JSON. Expected: 400 Bad Request
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"add",'
```

```json
{"error":{"code":"invalid_json","message":"request body must be a JSON object with an operation and numeric operands"}}
```

```bash
# Overflow. Expected: 400 Bad Request
curl -s -X POST http://localhost:8080/api/v1/calculate \
  -H 'Content-Type: application/json' \
  -d '{"operation":"multiply","operands":[1e308,10]}'
```

```json
{"error":{"code":"result_out_of_range","message":"result is out of range"}}
```

## Testing

GitHub Actions (`.github/workflows/ci.yml`) runs the backend and frontend checks on every push and pull request to `main`.

### Backend

```bash
cd backend
go vet ./...
go test ./...

# Coverage
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
go tool cover -html=coverage.out   # optional: browse in the browser
```

- `internal/calc`: table-driven tests for every operation, division by zero (including `-0`), unknown operations, wrong operand counts, and overflow.
- `internal/api`: table-driven `httptest` tests through the real router. They cover success responses, `Content-Type`, every error code, malformed, `null` and trailing JSON, `null` operands, and `405` for other methods.

### Frontend

```bash
cd frontend
npm run lint
npm run build      # type-checks the app and tests, then builds
npm test
npm run coverage   # HTML report in frontend/coverage/index.html
```

- `lib/number.test.ts`: which inputs are accepted and rejected, and how results are rounded for display.
- `api/calculator.test.ts`: the request format, successful results, API errors, network failures, and unexpected responses (non-JSON or the wrong shape).
- `components/CalculatorForm.test.tsx`: calls the API with the parsed numbers and shows the result, shows field errors without calling the API, shows the loading state, maps each error kind to a message, clears the old result on edit, and locks the inputs while a request is in flight.

### Coverage results

| Layer    | Scope                    | Coverage                              |
| -------- | ------------------------ | ------------------------------------- |
| Backend  | `internal/calc`          | 100%                                  |
| Backend  | `internal/api`           | 90.7%                                 |
| Backend  | Total                    | 79.4%                                 |
| Frontend | All files                | 98.3% statements, 100% branches       |

All 47 frontend tests pass.

The Go total is lower because `cmd/server` contains only startup code and has no tests. The uncovered lines in `internal/api` are the `500` fallback, which no current domain error triggers, and the log line for a failed response write. On the frontend, `App.tsx` (a layout wrapper) is the only file below 100%.

## Design decisions

- **One endpoint with an `operands` array.** Every operation is handled by one decode, validate and respond path. Each operation declares its arity, so `len(operands)` is checked against it. A missing operand is never silently treated as `0`, which can happen with fixed `a`/`b` fields. Single-operand operations such as square root can be added without changing the endpoint.
- **Domain logic is independent of HTTP.** `internal/calc` exposes one function, `Calculate(operation, operands)`, and returns sentinel errors. `internal/api` maps them to status codes and error codes in one `switch`. The math can be tested without HTTP, and HTTP behaviour can be tested separately.
- **Go standard library only.** The routing patterns added in Go 1.22 (`"POST /api/v1/calculate"`) cover routing and method matching. A framework would add dependencies without adding value at this size.
- **HTTP 400 for every client error.** Errors are told apart by a machine-readable `code`, not by different status codes. Only unexpected failures return 500, and their details are logged on the server, not sent to the client.
- **Strict request decoding.** The body must be exactly one JSON object. `null` bodies, `null` operands and trailing data are rejected, so ambiguous input never reaches the calculator.
- **The backend owns the math rules.** The frontend only checks that each input is a number. Rules like division by zero are enforced and reported by the backend alone.
- **The API client never throws.** `calculate()` returns one of `success`, `api-error`, `network-error` or `unexpected-response` (such as a proxy's HTML error page). The component handles each case explicitly.
- **A form instead of a keypad.** Two inputs and an operation selector map directly to one API request. A keypad would require a state machine for chaining and operator precedence, which is out of scope.
- **Local React state only.** The app is a single form, so it uses `useState` with no global store and no UI library. Text inputs use `inputMode="decimal"`, which shows a numeric keyboard on mobile, without the inconsistent browser validation of `type="number"`.

## Assumptions and limitations

- **Precision:** both layers use IEEE-754 doubles (Go `float64`, JS `number`). The API returns the raw value, for example `0.1 + 0.2 = 0.30000000000000004`. The UI rounds to 12 significant digits **for display only**, so the same calculation shows `0.3`.
- **Range:** results that overflow to ±Infinity or produce NaN are rejected with `result_out_of_range`. Very large or very small results are displayed in exponent notation, for example `1e+21`.
- **Input format:** the frontend accepts plain decimals only (`12`, `-3.5`, `.5`). Exponent notation (`1e5`), decimal commas (`1,5`), hex, `Infinity` and `NaN` are rejected. The API accepts any finite JSON number.
- **Stateless:** each request is independent. There is no history, persistence or authentication.
- **Duplicated operation list:** the frontend (`src/operations.ts`) and backend (`internal/calc`) each define the supported operations. Adding an operation means updating both.
- **Not included:** request body size limits, health checks, CORS (not needed with the dev proxy), and production deployment.

## Possible improvements

- **More operations:** exponentiation, square root and percentage. Each needs one registry entry in `internal/calc`. The UI would also need an `arity` field in `operations.ts` so it can show one input or two.
- **Docker:** a multi-stage build where the Go server also serves the built frontend from `frontend/dist`, so the whole stack runs from one image on one origin.
- **Operational hardening:** request size limits, a health check endpoint, and graceful shutdown.

## AI usage

I used AI as a reviewer and pair-programming aid throughout the assignment, including requirements analysis, design review, implementation support, and verification. I reviewed and finalized the architectural and implementation decisions myself. The prompts I used are in [AI_PROMPTS.md](AI_PROMPTS.md).
