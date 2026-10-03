// arity is the number of operands the backend expects; the form renders one input per operand.
export const OPERATIONS = [
  { value: 'add', label: 'Add (+)', arity: 2 },
  { value: 'subtract', label: 'Subtract (−)', arity: 2 },
  { value: 'multiply', label: 'Multiply (×)', arity: 2 },
  { value: 'divide', label: 'Divide (÷)', arity: 2 },
  { value: 'power', label: 'Power (xʸ)', arity: 2 },
  { value: 'sqrt', label: 'Square root (√x)', arity: 1 },
  { value: 'percentage', label: 'Percentage (x% of y)', arity: 2 },
] as const

export type Operation = (typeof OPERATIONS)[number]['value']
