export enum TokenType {
  // LITERALS
  NUMBER = "NUMBER",
  STRING = "STRING",
  IDENTIFIER = "IDENTIFIER",

  // KEYWORDS
  VAR = "var",
  CONST = "const",
  FUNC = "func",
  RETURN = "return",
  IF = "if",
  ELSE = "else",
  WHILE = "while",
  BREAK = "break",
  CONTINUE = "continue",
  FOR = "for",
  TYPEOF = "typeof",
  THROW = "throw",
  TRY = "try",
  CATCH = "catch",
  SWITCH = "switch",
  CASE = "case",
  DEFAULT = "default",
  DO = "do",

  // OPERATORS
  EQUAL = "EQUAL",
  EQUAL_EQUAL = "EQUAL_EQUAL",

  GREATER = "GREATER",
  GREATER_EQUAL = "GREATER_EQUAL",

  LESS = "LESS",
  LESS_EQUAL = "LESS_EQUAL",

  BANG = "BANG",
  BANG_EQUAL = "BANG_EQUAL",

  PLUS = "PLUS",
  PLUS_PLUS = "PLUS_PLUS",
  PLUS_EQUAL = "PLUS_EQUAL",

  MINUS = "MINUS",
  MINUS_MINUS = "MINUS_MINUS",
  MINUS_EQUAL = "MINUS_EQUAL",

  STAR = "STAR",
  STAR_EQUAL = "STAR_EQUAL",

  SLASH = "SLASH",
  SLASH_EQUAL = "SLASH_EQUAL",

  PERCENT = "PERCENT",
  PERCENT_EQUAL = "PERCENT_EQUAL",

  AND = "AND",
  AND_EQUAL = "AND_EQUAL",

  OR = "OR",
  OR_EQUAL = "OR_EQUAL",

  COLON = "COLON",
  SEMICOLON = "SEMICOLON",
  COMMA = "COMMA",
  DOT = "DOT",

  OPEN_BRACKET = "OPEN_BRACKET",
  CLOSE_BRACKET = "CLOSE_BRACKET",

  QUESTION = "QUESTION",

  // GROUPPING
  OPEN_PAREN = "OPEN_PAREN",
  CLOSE_PAREN = "CLOSE_PAREN",

  OPEN_CURLY_BRACE = "OPEN_CURLY_BRACE",
  CLOSE_CURLY_BRACE = "CLOSE_CURLY_BRACE",

  // OTHER
  EOF = "EOF",
}

export class Token {
  constructor(
    public type: TokenType,
    public value: string,
    public start: CharPosition,
    public end: CharPosition
  ) {}
}
