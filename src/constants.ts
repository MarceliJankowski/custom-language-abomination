// -----------------------------------------------
//                  ERROR CODE
// -----------------------------------------------

export enum ErrorCode {
  MISSING_ARG = 1,
  INVALID_ARG = 2,
  LEXER = 3,
  PARSER = 4,
  INTERPRETER = 5,
  INTERNAL = 255,
}

// -----------------------------------------------
//                  OPERATORS
// -----------------------------------------------

export const RELATIONAL_OPERATORS = [">", ">=", "<", "<="];
export const EQUALITY_OPERATORS = ["!=", "=="];

export const LOGICAL_OPERATOR_OR = "||";
export const LOGICAL_OPERATOR_AND = "&&";
export const LOGICAL_OPERATORS = [LOGICAL_OPERATOR_OR, LOGICAL_OPERATOR_AND];

export const BINARY_OPERATORS = ["+", "-", "*", "/", "%"].concat([
  ...RELATIONAL_OPERATORS,
  ...EQUALITY_OPERATORS,
  ...LOGICAL_OPERATORS,
]);

export const UNARY_OPERATORS = ["!", "++", "--"];
