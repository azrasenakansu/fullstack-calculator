import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculate, type CalculateResult } from '../api/calculator'
import { CalculatorForm } from './CalculatorForm'

vi.mock('../api/calculator', () => ({ calculate: vi.fn() }))

const calculateMock = vi.mocked(calculate)

async function fillAndSubmit(a: string, operation: string, b: string) {
  const user = userEvent.setup()
  if (a) await user.type(screen.getByLabelText('First number'), a)
  await user.selectOptions(screen.getByLabelText('Operation'), operation)
  if (b) await user.type(screen.getByLabelText('Second number'), b)
  await user.click(screen.getByRole('button', { name: 'Calculate' }))
  return user
}

describe('CalculatorForm', () => {
  beforeEach(() => {
    calculateMock.mockReset()
  })

  it('renders labeled inputs, all operations and a submit button', () => {
    render(<CalculatorForm />)

    expect(screen.getByLabelText('First number')).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByLabelText('Second number')).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual([
      'add',
      'subtract',
      'multiply',
      'divide',
    ])
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeEnabled()
  })

  it('sends parsed operands to the API and shows the result', async () => {
    calculateMock.mockResolvedValue({ kind: 'success', result: 2.5 })
    render(<CalculatorForm />)

    await fillAndSubmit('10', 'divide', '4')

    expect(calculateMock).toHaveBeenCalledWith('divide', [10, 4])
    expect(await screen.findByRole('status')).toHaveTextContent('2.5')
  })

  it('rounds the displayed result', async () => {
    calculateMock.mockResolvedValue({ kind: 'success', result: 0.1 + 0.2 })
    render(<CalculatorForm />)

    await fillAndSubmit('0.1', 'add', '0.2')

    expect(await screen.findByRole('status')).toHaveTextContent(/^0\.3$/)
  })

  it('shows field errors and does not call the API for invalid input', async () => {
    render(<CalculatorForm />)

    await fillAndSubmit('', 'add', 'abc')

    expect(screen.getByLabelText('First number')).toHaveAccessibleDescription('Enter a number.')
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Second number')).toHaveAccessibleDescription(
      'Enter a valid number, like 12 or -3.5.',
    )
    expect(calculateMock).not.toHaveBeenCalled()
  })

  it('disables the button while the calculation is in flight', async () => {
    let resolve!: (result: CalculateResult) => void
    calculateMock.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<CalculatorForm />)

    await fillAndSubmit('1', 'add', '2')

    expect(screen.getByRole('button', { name: 'Calculating…' })).toBeDisabled()

    resolve({ kind: 'success', result: 3 })

    expect(await screen.findByRole('button', { name: 'Calculate' })).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent('3')
  })

  it.each<[string, CalculateResult, string]>([
    [
      'division by zero',
      { kind: 'api-error', code: 'division_by_zero', message: 'division by zero' },
      'Cannot divide by zero.',
    ],
    [
      'an out-of-range result',
      { kind: 'api-error', code: 'result_out_of_range', message: 'result is out of range' },
      'Result is too large to represent.',
    ],
    [
      'other API errors',
      { kind: 'api-error', code: 'unknown_operation', message: 'unknown operation: "x"' },
      'unknown operation: "x"',
    ],
    ['a network error', { kind: 'network-error' }, "Can't reach the calculator service."],
    [
      'an unexpected response',
      { kind: 'unexpected-response' },
      'Something went wrong. Please try again.',
    ],
  ])('shows a message for %s', async (_, result, message) => {
    calculateMock.mockResolvedValue(result)
    render(<CalculatorForm />)

    await fillAndSubmit('1', 'divide', '0')

    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('clears the previous result when an input changes', async () => {
    calculateMock.mockResolvedValue({ kind: 'success', result: 3 })
    render(<CalculatorForm />)
    const user = await fillAndSubmit('1', 'add', '2')
    expect(await screen.findByRole('status')).toHaveTextContent('3')

    await user.type(screen.getByLabelText('Second number'), '5')

    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('clears the previous error when the operation changes', async () => {
    calculateMock.mockResolvedValue({ kind: 'network-error' })
    render(<CalculatorForm />)
    const user = await fillAndSubmit('1', 'add', '2')
    expect(await screen.findByRole('alert')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Operation'), 'multiply')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
