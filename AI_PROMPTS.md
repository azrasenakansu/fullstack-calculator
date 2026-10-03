# AI Prompts

I used an AI coding assistant (Claude Code) as a senior reviewer and pair-programming aid during this assignment. It analysed the requirements, reviewed my design decisions, proposed implementation plans, supported implementation, and ran verification checks. I made the final architectural and implementation decisions at each step.

This document contains the main prompts that materially guided the work. I also had smaller discussion and follow-up exchanges with the assistant while evaluating trade-offs and refining decisions; those are intentionally omitted for readability. The prompts below appear as I sent them, and each includes a short note on its outcome.

---

## Prompt 01 — Requirements and ambiguity analysis

```text
I'm working on a take-home assignment for a software engineering role. I'll paste the full brief below.

Context and constraints:
- Stack: React + TypeScript frontend, Go REST backend.
- Time budget: roughly 3 hours of focused work.
- Evaluators prioritize correctness, clarity, maintainability and tests over extra features.
- I will make the architectural decisions; your role is to act as a senior reviewer and pair.

I've already created the repository at ~/IdeaProjects/fullstack-calculator. It currently contains only a git init, a root .gitignore, an empty backend/ folder and an unmodified Vite React+TS scaffold in frontend/. Read it for context but do not modify anything yet.

Do NOT write any code yet. Instead:
1. Restate the requirements in your own words, split into must-have vs optional.
2. List every ambiguity or unstated assumption you see in the brief (e.g. how unary operations fit the API, number precision, what "intuitive UI" implies).
3. List the key design questions we need to settle before implementation, in the order you'd settle them, noting which decisions depend on others.

Keep it concise and structured.

--- BRIEF ---
[assignment brief pasted in full; see below]
```

<details>
<summary>Assignment brief as pasted</summary>

```text
Objective
Build a full-stack calculator application with a React frontend and a backend microservice. The frontend should consume the backend API to perform basic and advanced arithmetic operations. Focus on clean design, maintainable code, and testable architecture.

Requirements
Functional
Operations:
* Addition, Subtraction, Multiplication, Division
* Optional: Exponentiation, Square Root, Percentage

Frontend (React):
* Intuitive UI for entering input and displaying results
* Input validation and error handling
* Responsive design (basic mobile support)

Backend (REST API):
* Expose endpoints for calculator operations
* Validate input and handle edge cases (division by zero, invalid data)
* Return results in JSON format

Non-Functional
* Clean, readable, and idiomatic code (frontend and backend)
* Unit tests covering key functionality for both layers
* Documentation: setup instructions, API usage, and design rationale
* Optional: Dockerfile for full-stack deployment

Constraints
* Frontend: React (TypeScript preferred)
* Backend: Go is preferred

Deliverables
1. Git repository with frontend and backend code
2. README with setup instructions, API examples, and design decisions
3. Unit tests and coverage report
4. Optional: Dockerfile to run frontend + backend together
```

</details>

**Outcome:** The requirements were split into must-have and optional. The open questions were listed: how unary operations fit the API, percentage semantics, float precision, form UI versus keypad, the error contract, and dev proxy versus CORS. They were put in the order to decide them. No code was written.

---

## Prompt 02 — Design review

```text
We’ve finished the initial requirements/ambiguity review. Before coding, I want to lock the main design decisions.
Current direction:

* Go `float64` / JS `number`. I considered decimal arithmetic, but arbitrary precision feels unnecessary for this scope.
* Required ops first: add, subtract, multiply, divide. Optional ops only if time remains.
* Form-style UI with two inputs + operation selector, mainly to keep the UI simple and map each calculation directly to one API request.
* `POST /api/v1/calculate` rather than separate endpoints, to keep the API contract and HTTP handling consistent.
* If I add unary operations like sqrt later, I want the request model to support them without redesigning the endpoint.
* Consistent JSON errors.
* Keep calculator logic separate from HTTP so it can be tested independently.
* Go stdlib `net/http`; a framework seems unnecessary for an API this small.
* No DB/auth/global state because calculations are stateless and none of them add value here.
* Vite proxy for `/api`.
* Go table-driven + `httptest` tests.
* Vitest + React Testing Library.
* Coverage is required.
* Docker only if time remains.

Still do not write code.
Review these decisions like a senior engineer. Point out anything genuinely risky or poorly justified for a ~3 hour take-home, but avoid overengineering things that are reasonable to leave out of scope.
Tell me:

1. What, if anything, you would change before implementation
2. What assumptions I should document
3. What final architecture these decisions imply

I’ll make the final call before coding.
```

**Outcome:** The review recommended five changes:
- an `operands` array instead of fixed `a`/`b` fields
- rejecting non-finite results
- text inputs with `inputMode="decimal"`
- an API client that handles non-JSON responses
- explicit status codes

It also gave a list of assumptions to document and a proposed package layout.

---

## Prompt 03 — Backend implementation plan

```text
Good points. I’m locking the architecture with a few changes based on the review:

* I’ll use `{ operation, operands: number[] }`. The arity validation and missing-vs-zero issue are good reasons for it.
* I’ll reject non-finite results in the domain layer.
* Frontend inputs will use text + `inputMode="decimal"` with a small parsing function.
* The API client should distinguish structured API errors from network/unexpected responses.
* I’m keeping all calculation/input errors under HTTP 400 with machine-readable error codes rather than introducing 422.
* Coverage will be generated for both layers and summarized in the README.
* I’m not adding health checks, request-size middleware, CI or other operational extras unless the required work is finished.

The rest of the architecture stays as discussed.
Now give me a minimal backend implementation plan, file by file, in the order you would build it. Do not write the implementation yet and do not introduce new architecture decisions unless something is actually blocking.
```

**Outcome:** The architecture was locked. I chose HTTP 400 for every client error, not the suggested 422, and dropped the operational extras. A file-by-file backend plan followed: `go.mod` → `internal/calc` → tests → `internal/api` → tests → `cmd/server`. The plan flagged a remaining gap: a `null` operand would silently decode as `0`.

---

## Prompt 04 — Backend implementation

```text
The backend plan looks good. Two final decisions before implementation:

* Use `[]*float64` only in the HTTP request DTO so explicit `null` operands can be rejected, then convert to `[]float64` before calling the domain package.
* Make sure the request contains exactly one JSON value; reject trailing JSON rather than silently accepting it.

I don't think we need a specific `0.1 + 0.2` test just to prove IEEE-754 behavior. Document the precision choice in the README instead.
Everything else in the plan is locked.
Now implement the backend in the planned order:

1. `go.mod`
2. `internal/calc`
3. calculator tests
4. `internal/api`
5. handler tests
6. `cmd/server`

Keep it minimal and idiomatic. Do not add new packages, features or abstractions unless implementation reveals a real blocker.
After implementation, run the tests, `go vet`, and coverage, then summarize:

* files created
* test results
* coverage
* any decision you had to make that wasn't already settled
```

**Outcome:** The Go backend was built with the standard library only, including table-driven domain tests and `httptest` handler tests. It came out at 100% coverage for `calc` and 90.7% for `api`.

---

## Prompt 05 — Frontend implementation plan

```text
The backend is done and tested. Before moving on, make the top-level JSON `null` case return `invalid_json`, remove the obsolete `.gitkeep`, and rerun the backend tests.
Then plan the frontend implementation. Don't write the frontend code yet.
Keep the existing Vite React + TypeScript scaffold and the same scope decisions:

* Form UI, not a calculator keypad
* Two operands for the required operations
* Every calculation goes through `POST /api/v1/calculate`
* Text inputs with `inputMode="decimal"`
* A small pure number-parsing function
* Client-side validation for input format only; math rules stay on the backend
* A dedicated typed API client
* Distinguish API errors from network/unexpected errors
* Loading state and clear result/error display
* Basic responsive/mobile support
* Vitest + React Testing Library
* No global state or UI framework unless there's a strong reason

Give me the minimal file-by-file build order and the key tests you would write. Keep it within the remaining take-home scope and don't introduce new architecture decisions unless something is blocking.
```

**Outcome:** A request body of just `null` was fixed to return `invalid_json`. A file-by-file frontend plan followed, with key tests for each file. Two UX questions were raised for me to decide: rounding results for display, and clearing the result when inputs change.

---

## Prompt 06 — Frontend implementation

```text
The frontend plan looks good. Final choices:

* Use display-only rounding with `toPrecision(12)`. The API value stays unchanged.
* Clear the previous result/error when either input or the operation changes.
* Plain decimal input is enough; scientific notation does not need to be supported.

Everything else in the plan is locked.
Implement the frontend in the planned order. Keep the existing Vite + React + TypeScript setup, stay minimal, and don't add new abstractions or dependencies beyond the test tooling already listed.
After implementation, run lint, build, tests and coverage, then summarize:

* files changed/created
* test results
* coverage
* any decision that wasn't already settled
* anything still missing from the assignment requirements
```

**Outcome:** The React frontend was built: a parsing and formatting module, an API client that never throws, the form component, and tests. It was checked end to end in the browser against the real backend. The test tooling versions were pinned so they work with the supported Node versions.

---

## Prompt 07 — Final submission review

```text
The required backend and frontend are now implemented and tested.
Before writing the README, review the repository as a final take-home submission.
Do not add features or rewrite working code. Look specifically for:

* missing assignment requirements
* correctness issues
* inconsistencies between frontend and backend contracts
* unnecessary files or generated artifacts that should not be committed
* documentation gaps
* anything that would make the project difficult for an evaluator to clone and run

Separate actual blockers from optional polish.
Then give me a concise README outline based only on the final implementation.
```

Follow-up:

```text
Yes, fix blockers 2–4 now.

* Delete the Vite template `frontend/README.md`; the root README will be the only project documentation.
* Fix the stale-result case using `<fieldset disabled={loading}>` and add one focused regression test.
* Ignore the entire `.claude/` directory in the root `.gitignore`.

Don’t make any other frontend changes.
After that, rerun lint, build, tests and coverage and tell me only whether anything changed unexpectedly. Then we’ll write the root README.
```

**Outcome:** The review included a fresh-clone check. It found four blockers:
- the missing README
- the leftover Vite template README
- a stale result that could appear after editing during a request
- local tooling configuration that shouldn't be committed

The last three were fixed. The stale-result fix got a regression test, which was confirmed to fail without the fix.

---

## Prompt 08 — README and documentation

```text
The required implementation is now complete and all tests are green.
Write the root `README.md` based on the actual repository as it exists now. Do not invent features or change the implementation.
It should include:

* Short project overview
* Tech stack
* Project structure
* Prerequisites: Go 1.22+ and Node 22 or 24 LTS
* How to run the backend
* How to run the frontend with `npm ci`
* API contract for `POST /api/v1/calculate`
* curl examples for a successful request and common errors
* Supported operations
* Error codes
* How to run backend and frontend tests
* Coverage results
* Main design decisions and why I made them
* Assumptions and limitations
* A short “Possible improvements” section for optional features such as sqrt/power, Docker and CI

Keep it concise and written for an evaluator who wants to clone the repo and understand/run it quickly.
Important implementation details to document:

* Request shape is `{ "operation": "...", "operands": [...] }`
* Backend uses Go stdlib only
* Calculator domain logic is independent from HTTP
* All calculation/input errors use structured JSON and HTTP 400; unexpected server errors use 500
* IEEE-754 `float64` / JS `number` is used; rounding to 12 significant digits is display-only
* Frontend accepts plain decimal input only
* Vite proxies `/api` to the Go backend during development
* The application is stateless; there is no persistence or authentication

Current coverage:

* Go `internal/calc`: 100%
* Go `internal/api`: 90.7%
* Go total: 79.4%, mainly because `cmd/server` is thin wiring code and has no tests
* Frontend: 98.3% statement coverage, 100% branch coverage
* Frontend tests: 47/47 passing

Before writing, inspect the repository so the commands, file paths and API examples match the actual code.
Do not include the npm debugging history or local `.claude` tooling in the README.
```

Follow-up:

```text
The root README is mostly good. Please make only these final documentation changes and do not change the implementation:

1. Add an AI usage section near the end:
   * Say AI was used as a reviewer and pair-programming aid.
   * Make it clear that architectural and implementation decisions were reviewed and finalized by me.
   * Link to a root-level `AI_PROMPTS.md` file, which I will add next.
2. Fix the curl examples so they don’t imply that `curl -s` prints HTTP status codes.
   * Keep the commands simple.
   * Prefer comments like `# Expected: 200 OK` above the command, and show only the JSON body below.
3. Add a clone step under Getting Started using:
`https://github.com/azrasenakansu/fullstack-calculator.git`
Then continue with `cd fullstack-calculator`.
4. Change the opening sentence:
from “no arithmetic is done in the browser”
to something more precise like:
“All calculator operations are performed by the backend API; the frontend only validates input and formats results for display.”
5. In the frontend testing section, also include `npm run build`, since that is part of the verified fresh-clone checks.

Keep the README concise. Do not add new sections beyond what is needed for these changes, and do not alter any technical claims unless required by the points above.
After updating it, summarize exactly what changed and nothing else.
```

**Outcome:** The root `README.md` was written. Its commands, coverage figures and curl responses were checked against the running code. A second pass made it more precise, and this file was then added to document the process.
