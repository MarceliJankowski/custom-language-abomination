// PROJECT MODULES
import { EQUALITY_OPERATORS, RELATIONAL_OPERATORS } from "../constants";

/**@desc determine whether `operator` is a valid equality binary-operator*/
export function isEqualityOperator(operator: string): boolean {
  return EQUALITY_OPERATORS.some(validOperator => operator === validOperator);
}

/**@desc determine whether `operator` is a valid relational binary-operator*/
export function isRelationalOperator(operator: string): boolean {
  return RELATIONAL_OPERATORS.some(validOperator => operator === validOperator);
}
