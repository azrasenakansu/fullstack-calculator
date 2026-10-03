import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculate } from './calculator'

function mockFetch(response: Response | Promise<never>) {
  const fetchMock = vi.fn().mockReturnValue(
    response instanceof Response ? Promise.resolve(response) : response,
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('calculate', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the operation and operands as JSON', async () => {
    const fetchMock = mockFetch(jsonResponse(200, { result: 2.5 }))

    await calculate('divide', [10, 4])

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation: 'divide', operands: [10, 4] }),
    })
  })

  it('returns the result on success', async () => {
    mockFetch(jsonResponse(200, { result: 2.5 }))

    expect(await calculate('divide', [10, 4])).toEqual({ kind: 'success', result: 2.5 })
  })

  it('returns structured API errors', async () => {
    mockFetch(
      jsonResponse(400, { error: { code: 'division_by_zero', message: 'division by zero' } }),
    )

    expect(await calculate('divide', [1, 0])).toEqual({
      kind: 'api-error',
      code: 'division_by_zero',
      message: 'division by zero',
    })
  })

  it('reports a network error when the request fails', async () => {
    mockFetch(Promise.reject(new TypeError('Failed to fetch')))

    expect(await calculate('add', [1, 2])).toEqual({ kind: 'network-error' })
  })

  it.each([
    ['502 with an HTML body', new Response('<html>Bad Gateway</html>', { status: 502 })],
    ['503 with an empty body', new Response(null, { status: 503 })],
    ['504 with a JSON body', jsonResponse(504, { error: { code: 'x', message: 'y' } })],
  ])('reports a network error when the proxy returns %s', async (_, response) => {
    mockFetch(response)

    expect(await calculate('add', [1, 2])).toEqual({ kind: 'network-error' })
  })

  it.each([
    ['a non-JSON body', new Response('<html>Internal Server Error</html>', { status: 500 })],
    ['a success response without a numeric result', jsonResponse(200, {})],
    ['an error response without the error shape', jsonResponse(400, { message: 'nope' })],
    ['an error-shaped body with a success status', jsonResponse(200, { error: { code: 'x', message: 'y' } })],
  ])('reports an unexpected response for %s', async (_, response) => {
    mockFetch(response)

    expect(await calculate('add', [1, 2])).toEqual({ kind: 'unexpected-response' })
  })
})
