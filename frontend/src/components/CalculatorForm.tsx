import { useState, type FormEvent } from 'react'
import { calculate, type CalculateResult } from '../api/calculator'
import { formatResult, parseNumber } from '../lib/number'
import { OPERATIONS, type Operation } from '../operations'

type Status =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'success'; result: number }
  | { kind: 'error'; message: string }

type FieldErrors = { a?: string; b?: string }

function errorMessage(result: Exclude<CalculateResult, { kind: 'success' }>): string {
  switch (result.kind) {
    case 'api-error':
      if (result.code === 'division_by_zero') return 'Cannot divide by zero.'
      if (result.code === 'result_out_of_range') return 'Result is too large to represent.'
      return result.message
    case 'network-error':
      return "Can't reach the calculator service."
    case 'unexpected-response':
      return 'Something went wrong. Please try again.'
  }
}

export function CalculatorForm() {
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const [operation, setOperation] = useState<Operation>('add')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const loading = status.kind === 'loading'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedA = parseNumber(a)
    const parsedB = parseNumber(b)
    setFieldErrors({
      a: parsedA.ok ? undefined : parsedA.error,
      b: parsedB.ok ? undefined : parsedB.error,
    })
    if (!parsedA.ok || !parsedB.ok) {
      return
    }

    setStatus({ kind: 'loading' })
    const result = await calculate(operation, [parsedA.value, parsedB.value])
    setStatus(
      result.kind === 'success'
        ? { kind: 'success', result: result.result }
        : { kind: 'error', message: errorMessage(result) },
    )
  }

  // Any edit invalidates the previously shown result or error.
  function resetStatus() {
    setStatus({ kind: 'idle' })
  }

  return (
    <form className="calculator" onSubmit={handleSubmit} noValidate>
      {/* Disabled while loading so a late response can never sit next to edited inputs. */}
      <fieldset className="fields" disabled={loading}>
        <div className="field">
          <label htmlFor="operand-a">First number</label>
          <input
            id="operand-a"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={a}
            onChange={(e) => {
              setA(e.target.value)
              resetStatus()
            }}
            aria-invalid={fieldErrors.a ? true : undefined}
            aria-describedby={fieldErrors.a ? 'operand-a-error' : undefined}
          />
          {fieldErrors.a && (
            <p id="operand-a-error" className="field-error">
              {fieldErrors.a}
            </p>
          )}
        </div>

        <div className="field">
          <label htmlFor="operation">Operation</label>
          <select
            id="operation"
            value={operation}
            onChange={(e) => {
              setOperation(e.target.value as Operation)
              resetStatus()
            }}
          >
            {OPERATIONS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="operand-b">Second number</label>
          <input
            id="operand-b"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={b}
            onChange={(e) => {
              setB(e.target.value)
              resetStatus()
            }}
            aria-invalid={fieldErrors.b ? true : undefined}
            aria-describedby={fieldErrors.b ? 'operand-b-error' : undefined}
          />
          {fieldErrors.b && (
            <p id="operand-b-error" className="field-error">
              {fieldErrors.b}
            </p>
          )}
        </div>
      </fieldset>

      <button type="submit" disabled={loading}>
        {loading ? 'Calculating…' : 'Calculate'}
      </button>

      <output className="result" htmlFor="operand-a operation operand-b" aria-live="polite">
        {status.kind === 'success' && formatResult(status.result)}
      </output>
      {status.kind === 'error' && (
        <p className="error" role="alert">
          {status.message}
        </p>
      )}
    </form>
  )
}
