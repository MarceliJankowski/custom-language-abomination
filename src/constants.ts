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

export const LOGICAL_OPERATORS = ["||", "&&"];

export const ADDITIVE_OPERATORS = ["+", "-"];
export const MULTIPLICATIVE_OPERATORS = ["*", "/", "%"];

export const BINARY_OPERATORS = [
  ...ADDITIVE_OPERATORS,
  ...MULTIPLICATIVE_OPERATORS,
  ...RELATIONAL_OPERATORS,
  ...EQUALITY_OPERATORS,
  ...LOGICAL_OPERATORS,
];

export const UNARY_OPERATORS = ["!", "++", "--"];

export const ASSIGNMENT_OPERATORS = ["=", "+=", "-=", "*=", "/=", "%=", "||=", "&&="];
