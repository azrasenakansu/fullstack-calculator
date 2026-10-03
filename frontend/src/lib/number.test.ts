import { describe, expect, it } from 'vitest'
import { formatResult, parseNumber } from './number'

describe('parseNumber', () => {
  it.each([
    ['5', 5],
    ['-3', -3],
    ['+2', 2],
    ['2.5', 2.5],
    ['.5', 0.5],
    ['5.', 5],
    ['  7 ', 7],
    ['0', 0],
    ['-0', -0],
  ])('accepts %j', (input, expected) => {
    expect(parseNumber(input)).toEqual({ ok: true, value: expected })
  })

  it.each(['', '   '])('asks for a number when input is %j', (input) => {
    expect(parseNumber(input)).toEqual({ ok: false, error: 'Enter a number.' })
  })

  it.each(['abc', '1.2.3', '1,5', '--1', '0x10', 'Infinity', 'NaN', '1e5', '.', '-'])(
    'rejects %j as invalid',
    (input) => {
      expect(parseNumber(input)).toEqual({
        ok: false,
        error: 'Enter a valid number, like 12 or -3.5.',
      })
    },
  )

  it('rejects numbers too large to represent', () => {
    expect(parseNumber('9'.repeat(400))).toEqual({ ok: false, error: 'Number is too large.' })
  })
})

describe('formatResult', () => {
  it.each([
    [0.1 + 0.2, '0.3'],
    [2.5, '2.5'],
    [-10, '-10'],
    [1 / 3, '0.333333333333'],
  ])('formats %d as %j', (value, expected) => {
    expect(formatResult(value)).toBe(expected)
  })
})
