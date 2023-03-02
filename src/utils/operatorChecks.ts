// PROJECT MODULES
import {
  EQUALITY_OPERATORS,
  RELATIONAL_OPERATORS,
  ADDITIVE_OPERATORS,
  MULTIPLICATIVE_OPERATORS,
} from "../constants";

/**@desc determine whether `operator` is a valid equality binary-operator*/
export function isEqualityOperator(operator: string): boolean {
  return EQUALITY_OPERATORS.some(validOperator => operator === validOperator);
}

/**@desc determine whether `operator` is a valid relational binary-operator*/
export function isRelationalOperator(operator: string): boolean {
  return RELATIONAL_OPERATORS.some(validOperator => operator === validOperator);
}

export function isAdditiveOperator(operator: string): boolean {
  return ADDITIVE_OPERATORS.some(validOperator => operator === validOperator);
}

export function isMultiplicativeOperator(operator: string): boolean {
  return MULTIPLICATIVE_OPERATORS.some(validOperator => operator === validOperator);
}
