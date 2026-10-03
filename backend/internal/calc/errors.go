package calc

import "errors"

// Sentinel errors returned by Calculate. Callers should match them with errors.Is,
// since some are wrapped with additional context.
var (
	ErrUnknownOperation = errors.New("unknown operation")
	ErrOperandCount     = errors.New("invalid number of operands")
	ErrDivisionByZero   = errors.New("division by zero")
	ErrNonFiniteResult  = errors.New("result is out of range")
)
