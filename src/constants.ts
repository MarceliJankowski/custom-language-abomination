// PROJECT MODULES
import { MK, Runtime } from "./backend";
import { TokenType } from "./frontend";

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

export const RELATIONAL_OPERATORS = [
  TokenType.GREATER,
  TokenType.GREATER_EQUAL,
  TokenType.LESS,
  TokenType.LESS_EQUAL,
];

export const EQUALITY_OPERATORS = [TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL];

export const LOGICAL_OPERATORS = [TokenType.OR, TokenType.AND];

export const ADDITIVE_OPERATORS = [TokenType.PLUS, TokenType.MINUS];
export const MULTIPLICATIVE_OPERATORS = [TokenType.STAR, TokenType.SLASH, TokenType.PERCENT];

export const BINARY_OPERATORS = [
  ...ADDITIVE_OPERATORS,
  ...MULTIPLICATIVE_OPERATORS,
  ...RELATIONAL_OPERATORS,
  ...EQUALITY_OPERATORS,
  ...LOGICAL_OPERATORS,
];

export const UNARY_OPERATORS = [TokenType.BANG, TokenType.PLUS_PLUS, TokenType.MINUS_MINUS, TokenType.TYPEOF];

export const ASSIGNMENT_OPERATORS = [
  TokenType.EQUAL,
  TokenType.PLUS_EQUAL,
  TokenType.MINUS_EQUAL,
  TokenType.STAR_EQUAL,
  TokenType.SLASH_EQUAL,
  TokenType.PERCENT_EQUAL,
  TokenType.OR_EQUAL,
  TokenType.AND_EQUAL,
];

// -----------------------------------------------
//        VALID MEMBER-EXPRESSION TYPES
// -----------------------------------------------

export const VALID_MEMBER_EXPR_RUNTIME_TYPES: Runtime.ValueType[] = [
  "number",
  "string",
  "boolean",
  "object",
  "array",
];

// -----------------------------------------------
//                FALSY VALUSES
// -----------------------------------------------

export const RUNTIME_FALSY_VALUES = [MK.BOOL(false), MK.UNDEFINED(), MK.NULL(), MK.NUMBER(0), MK.STRING("")];
