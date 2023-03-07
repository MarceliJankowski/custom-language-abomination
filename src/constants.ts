// PROJECT MODULES
import { MK, Runtime } from "./backend";

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

// -----------------------------------------------
//        VALID MEMBER-EXPRESSION NODES
// -----------------------------------------------

export const VALID_MEMBER_EXP_AST_NODES: AST_Node[] = [
  "Identifier", // includes booleans
  "ArrayLiteral",
  "ObjectLiteral",
  "StringLiteral",
  "NumericLiteral",
];

export const VALID_MEMBER_EXP_RUNTIME_TYPES: Runtime.ValueType[] = [
  "number",
  "string",
  "boolean",
  "object",
  "array",
];

// -----------------------------------------------
//                FALSY VALUSES
// -----------------------------------------------

export const RUNTIME_FALSY_VALUES = [MK.BOOL(false), MK.UNDEFINED(), MK.NULL(), MK.NUMBER(0)];
