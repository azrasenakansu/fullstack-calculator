package calc

import (
	"errors"
	"math"
	"testing"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name     string
		op       string
		operands []float64
		want     float64
		wantErr  error
	}{
		{name: "add", op: "add", operands: []float64{2, 3}, want: 5},
		{name: "add negatives", op: "add", operands: []float64{-2, -3}, want: -5},
		{name: "add decimals", op: "add", operands: []float64{1.5, 2.25}, want: 3.75},
		{name: "subtract", op: "subtract", operands: []float64{10, 4}, want: 6},
		{name: "subtract to negative", op: "subtract", operands: []float64{4, 10}, want: -6},
		{name: "multiply", op: "multiply", operands: []float64{6, 7}, want: 42},
		{name: "multiply by negative", op: "multiply", operands: []float64{2.5, -4}, want: -10},
		{name: "multiply by zero", op: "multiply", operands: []float64{123, 0}, want: 0},
		{name: "divide", op: "divide", operands: []float64{10, 4}, want: 2.5},
		{name: "divide negative", op: "divide", operands: []float64{-9, 3}, want: -3},
		{name: "divide zero by number", op: "divide", operands: []float64{0, 5}, want: 0},

		{name: "divide by zero", op: "divide", operands: []float64{1, 0}, wantErr: ErrDivisionByZero},
		{name: "divide by negative zero", op: "divide", operands: []float64{1, math.Copysign(0, -1)}, wantErr: ErrDivisionByZero},

		{name: "unknown operation", op: "modulo", operands: []float64{1, 2}, wantErr: ErrUnknownOperation},
		{name: "empty operation", op: "", operands: []float64{1, 2}, wantErr: ErrUnknownOperation},

		{name: "nil operands", op: "add", operands: nil, wantErr: ErrOperandCount},
		{name: "no operands", op: "add", operands: []float64{}, wantErr: ErrOperandCount},
		{name: "one operand", op: "subtract", operands: []float64{1}, wantErr: ErrOperandCount},
		{name: "three operands", op: "multiply", operands: []float64{1, 2, 3}, wantErr: ErrOperandCount},

		{name: "add overflow", op: "add", operands: []float64{math.MaxFloat64, math.MaxFloat64}, wantErr: ErrNonFiniteResult},
		{name: "subtract overflow", op: "subtract", operands: []float64{-math.MaxFloat64, math.MaxFloat64}, wantErr: ErrNonFiniteResult},
		{name: "multiply overflow", op: "multiply", operands: []float64{math.MaxFloat64, 2}, wantErr: ErrNonFiniteResult},
		{name: "divide overflow", op: "divide", operands: []float64{math.MaxFloat64, 0.5}, wantErr: ErrNonFiniteResult},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Calculate(tt.op, tt.operands)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Calculate(%q, %v) error = %v, want %v", tt.op, tt.operands, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Calculate(%q, %v) unexpected error: %v", tt.op, tt.operands, err)
			}
			if got != tt.want {
				t.Errorf("Calculate(%q, %v) = %v, want %v", tt.op, tt.operands, got, tt.want)
			}
		})
	}
}
