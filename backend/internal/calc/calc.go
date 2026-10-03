// Package calc implements the calculator's arithmetic rules, independent of any transport.
package calc

import (
	"fmt"
	"math"
)

type operation struct {
	arity int
	apply func(operands []float64) (float64, error)
}

var operations = map[string]operation{
	"add": {arity: 2, apply: func(o []float64) (float64, error) {
		return o[0] + o[1], nil
	}},
	"subtract": {arity: 2, apply: func(o []float64) (float64, error) {
		return o[0] - o[1], nil
	}},
	"multiply": {arity: 2, apply: func(o []float64) (float64, error) {
		return o[0] * o[1], nil
	}},
	"divide": {arity: 2, apply: func(o []float64) (float64, error) {
		if o[1] == 0 {
			return 0, ErrDivisionByZero
		}
		return o[0] / o[1], nil
	}},
	"power": {arity: 2, apply: func(o []float64) (float64, error) {
		if o[0] == 0 && o[1] < 0 {
			return 0, fmt.Errorf("%w: zero cannot be raised to a negative power", ErrUndefinedResult)
		}
		return math.Pow(o[0], o[1]), nil
	}},
	"sqrt": {arity: 1, apply: func(o []float64) (float64, error) {
		if o[0] < 0 {
			return 0, fmt.Errorf("%w: square root of a negative number", ErrUndefinedResult)
		}
		return math.Sqrt(o[0]), nil
	}},
	"percentage": {arity: 2, apply: func(o []float64) (float64, error) {
		// percentage * value / 100, scaling the larger-magnitude operand first so the
		// intermediate product cannot overflow when the final result is representable.
		if math.Abs(o[0]) >= math.Abs(o[1]) {
			return o[0] / 100 * o[1], nil
		}
		return o[0] * (o[1] / 100), nil
	}},
}

// Calculate applies the named operation to operands, in order.
// It returns ErrUnknownOperation, ErrOperandCount, ErrDivisionByZero,
// ErrUndefinedResult or ErrNonFiniteResult (possibly wrapped) when the
// calculation cannot be performed.
func Calculate(name string, operands []float64) (float64, error) {
	op, ok := operations[name]
	if !ok {
		return 0, fmt.Errorf("%w: %q", ErrUnknownOperation, name)
	}
	if len(operands) != op.arity {
		return 0, fmt.Errorf("%w: %s expects %d, got %d", ErrOperandCount, name, op.arity, len(operands))
	}

	result, err := op.apply(operands)
	if err != nil {
		return 0, err
	}
	// Operands are finite, so NaN means the operation is undefined for them
	// (e.g. a negative base with a fractional exponent), while ±Inf means overflow.
	if math.IsNaN(result) {
		return 0, ErrUndefinedResult
	}
	if math.IsInf(result, 0) {
		return 0, ErrNonFiniteResult
	}
	return result, nil
}
