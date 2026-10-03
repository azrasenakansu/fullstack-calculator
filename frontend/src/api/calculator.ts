import type { Operation } from '../operations'

export type CalculateResult =
  | { kind: 'success'; result: number }
  | { kind: 'api-error'; code: string; message: string }
  | { kind: 'network-error' }
  | { kind: 'unexpected-response' }

const CALCULATE_URL = '/api/v1/calculate'

// calculate sends one calculation to the backend. It never throws: every
// outcome, including network failures, is returned as a CalculateResult.
export async function calculate(
  operation: Operation,
  operands: number[],
): Promise<CalculateResult> {
  let response: Response
  try {
    response = await fetch(CALCULATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation, operands }),
    })
  } catch {
    return { kind: 'network-error' }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { kind: 'unexpected-response' }
  }

  if (response.ok && isSuccessBody(body)) {
    return { kind: 'success', result: body.result }
  }
  if (!response.ok && isErrorBody(body)) {
    return { kind: 'api-error', code: body.error.code, message: body.error.message }
  }
  return { kind: 'unexpected-response' }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isSuccessBody(body: unknown): body is { result: number } {
  return isObject(body) && typeof body.result === 'number'
}

function isErrorBody(body: unknown): body is { error: { code: string; message: string } } {
  return (
    isObject(body) &&
    isObject(body.error) &&
    typeof body.error.code === 'string' &&
    typeof body.error.message === 'string'
  )
}
