export type ParseResult = { ok: true; value: number } | { ok: false; error: string }

// Plain decimals only: optional sign, digits with an optional fractional part.
// Rejects forms Number() would accept, such as "", "0x10", "1e5" and "Infinity".
const DECIMAL_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/

export function parseNumber(input: string): ParseResult {
  const trimmed = input.trim()
  if (trimmed === '') {
    return { ok: false, error: 'Enter a number.' }
  }
  if (!DECIMAL_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Enter a valid number, like 12 or -3.5.' }
  }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'Number is too large.' }
  }
  return { ok: true, value }
}

// Rounds to 12 significant digits for display only, hiding floating-point
// artifacts such as 0.1 + 0.2 = 0.30000000000000004.
export function formatResult(value: number): string {
  return String(Number(value.toPrecision(12)))
}
