// PROJECT MODULES
import { Err, escapeStringChars, getUniqueCharsFromStringArr } from "../utils";
import { UNARY_OPERATORS, BINARY_OPERATORS, ASSIGNMENT_OPERATORS } from "../constants";

// -----------------------------------------------
//                    STUFF
// -----------------------------------------------

/**@desc collection of `signs` which don't inherently adhere to a pre-defined industry standard (often have custom implementation / are not obvious) or could potentially change in the future
For instance: comment-sign differs from language to language while arithmetic operators commonly follow a standard*/
enum Sign {
  COMMENT = "#",
  ESCAPE = "\\",

  STRING_1 = '"',
  STRING_2 = "'",
}

export enum TokenType {
  // LITERALS
  NUMBER = "NUMBER",
  STRING = "STRING",
  IDENTIFIER = "IDENTIFIER",

  // KEYWORDS
  VAR = "VAR",
  CONST = "CONST",
  FUNC = "FUNC",
  RETURN = "RETURN",
  IF = "IF",
  ELSE = "ELSE",
  WHILE = "WHILE",
  BREAK = "BREAK",
  CONTINUE = "CONTINUE",
  FOR = "FOR",

  // OPERATORS
  UNARY_OPERATOR = "UNARY_OPERATOR",
  BINARY_OPERATOR = "BINARY_OPERATOR",
  ASSIGNMENT_OPERATOR = "ASSIGNMENT_OPERATOR",
  TERNARY_OPERATOR = "TERNARY_OPERATOR",

  COLON = "COLON",
  SEMICOLON = "SEMICOLON",
  COMMA = "COMMA",
  DOT = "DOT",

  OPEN_BRACKET = "OPEN_BRACKET",
  CLOSE_BRACKET = "CLOSE_BRACKET",

  // GROUPPING
  OPEN_PAREN = "OPEN_PAREN",
  CLOSE_PAREN = "CLOSE_PAREN",

  OPEN_CURLY_BRACE = "OPEN_CURLY_BRACE",
  CLOSE_CURLY_BRACE = "CLOSE_CURLY_BRACE",

  // OTHER
  EOF = "EOF",
}

/**@desc represents `valid` language Token*/
export class Token {
  constructor(
    public type: TokenType,
    public value: string,
    public start: CharPosition,
    public end: CharPosition
  ) {}
}

// KEYWORDS

const KEYWORDS: Map<string, TokenType> = new Map();

KEYWORDS.set("var", TokenType.VAR);
KEYWORDS.set("const", TokenType.CONST);
KEYWORDS.set("typeof", TokenType.UNARY_OPERATOR);
KEYWORDS.set("func", TokenType.FUNC);
KEYWORDS.set("return", TokenType.RETURN);
KEYWORDS.set("if", TokenType.IF);
KEYWORDS.set("else", TokenType.ELSE);
KEYWORDS.set("while", TokenType.WHILE);
KEYWORDS.set("break", TokenType.BREAK);
KEYWORDS.set("continue", TokenType.CONTINUE);
KEYWORDS.set("for", TokenType.FOR);

// -----------------------------------------------
//                    LEXER
// -----------------------------------------------

export class Lexer {
  private src: string[];
  private tokens: Token[];

  /**@desc tracks current character line*/
  private line: number;

  /**@desc tracks current character column*/
  private column: number = 0;

  /**@desc `index` of currently processed character*/
  private current: number = 0;

  constructor(sourceCode: string) {
    this.src = sourceCode.split("");
    this.tokens = new Array<Token>();

    this.line = this.isEOF() ? 0 : 1;
  }

  /**@desc parses `sourceCode` into Token[]*/
  public tokenize(): Token[] {
    while (this.notEOF()) {
      const char = this.at();

      switch (char) {
        // HANDLE SINGLE-CHARACTER TOKENS

        case ";": {
          this.addToken(TokenType.SEMICOLON, this.advance(), this.position);
          break;
        }

        case ":": {
          this.addToken(TokenType.COLON, this.advance(), this.position);
          break;
        }

        case ",": {
          this.addToken(TokenType.COMMA, this.advance(), this.position);
          break;
        }

        case "?": {
          this.addToken(TokenType.TERNARY_OPERATOR, this.advance(), this.position);
          break;
        }

        case ".": {
          this.addToken(TokenType.DOT, this.advance(), this.position);
          break;
        }

        case "(": {
          this.addToken(TokenType.OPEN_PAREN, this.advance(), this.position);
          break;
        }

        case ")": {
          this.addToken(TokenType.CLOSE_PAREN, this.advance(), this.position);
          break;
        }

        case "{": {
          this.addToken(TokenType.OPEN_CURLY_BRACE, this.advance(), this.position);
          break;
        }

        case "}": {
          this.addToken(TokenType.CLOSE_CURLY_BRACE, this.advance(), this.position);
          break;
        }

        case "[": {
          this.addToken(TokenType.OPEN_BRACKET, this.advance(), this.position);
          break;
        }

        case "]": {
          this.addToken(TokenType.CLOSE_BRACKET, this.advance(), this.position);
          break;
        }

        // HANDLE MULTI-CHARACTER TOKENS
        default: {
          // NUMBER
          if (this.isDigit(char)) {
            const startPosition = this.position;
            let value = this.advance();

            // BUILD NUMBER
            while (this.notEOF() && this.isDigit(this.at())) value += this.advance();

            // HANDLE DECIMAL POINT
            if (this.at() === "." && this.isDigit(this.peek())) {
              value += this.advance(); // append decimal point

              // BUILD DECIMAL
              while (this.notEOF() && this.isDigit(this.at())) value += this.advance();
            }

            this.addToken(TokenType.NUMBER, value, startPosition, this.position);
          }

          // STRING
          else if (this.isStringSign(char)) {
            const startPosition = this.position;
            const strSign = this.advance(); // get string-sign which was used for creating this string literal

            let value = "";
            let isEscaped = false; // track whether next character is escaped
            let isStrEnded = false; // track whether string ends with strSign

            // BUILD `str`
            while (this.notEOF()) {
              let char = this.advance();

              // handle escape-sign (allow for double escape-sign, like '\\' with: !isEscaped)
              if (char === Sign.ESCAPE && !isEscaped) {
                isEscaped = true;
                continue;
              }

              // handle escape sequences
              if (isEscaped) {
                // cases form a list of valid escapable characters (javascript supported escape sequences)
                // switch statement is necessary because in JS: "\\" + "b" does not equal: "\b" but: "\\b"
                switch (char) {
                  case Sign.ESCAPE:
                  case Sign.STRING_1:
                  case Sign.STRING_2: {
                    // these escape sequences don't require explicit character assignment
                    break;
                  }

                  case "b": {
                    char = "\b";
                    break;
                  }

                  case "f": {
                    char = "\f";
                    break;
                  }

                  case "n": {
                    char = "\n";
                    break;
                  }

                  case "r": {
                    char = "\r";
                    break;
                  }

                  case "t": {
                    char = "\t";
                    break;
                  }

                  case "v": {
                    char = "\v";
                    break;
                  }

                  default:
                    throw new Err(
                      `Invalid escape character: '\\${char}' at position: ${this.position}`,
                      "lexer"
                    );
                }
              }

              // handle string end
              if (char === strSign && isEscaped == false) {
                isStrEnded = true;
                break;
              }

              value += char;
              isEscaped = false;
            }

            // check whether string was ended
            if (!isStrEnded) {
              throw new Err(
                `Invalid string literal. String: '${value}' lacks ending: (${strSign}) at position: ${this.position}`,
                "lexer"
              );
            }

            this.addToken(TokenType.STRING, value, startPosition, this.position);
          }

          // IDENTIFIER
          else if (this.isAlpha(char)) {
            const startPosition = this.position;
            let identifier = this.advance();

            // BUILD identifier
            while (this.notEOF() && this.isAlpha(this.at())) identifier += this.advance();

            // handle reserved keywords
            const keywordType = KEYWORDS.get(identifier);

            if (keywordType) this.addToken(keywordType, identifier, startPosition, this.position);
            else this.addToken(TokenType.IDENTIFIER, identifier, startPosition, this.position);
          }

          // UNARY/BINARY/ASSIGNMENT OPERATORS
          else if (
            this.isPartiallyUnaryOperator(char) ||
            this.isPartiallyBinaryOperator(char) ||
            this.isPartiallyAssignmentOperator(char)
          ) {
            const startPosition = this.position;
            let operator = this.advance();

            // iterate for as long as current-char could be a part of a unary/binary/assignment operator
            while (
              this.notEOF() &&
              (this.isPartiallyUnaryOperator(this.at()) ||
                this.isPartiallyBinaryOperator(this.at()) ||
                this.isPartiallyAssignmentOperator(this.at()))
            ) {
              // BUILD operator
              operator += this.advance();
            }

            switch (operator) {
              // HANDLE SINGLE-CHARACTER TOKENS WHICH ARE ALSO A PART OF: UNARY/BINARY/ASSOCIATIVE OPERATORS

              // none

              // HANDLE MULTI-CHARACTER UNARY/BINARY/ASSOCIATIVE OPERATORS
              default: {
                // binary operator
                if (this.isBinaryOperator(operator)) {
                  this.addToken(TokenType.BINARY_OPERATOR, operator, startPosition, this.position);
                }

                // unary operator
                else if (this.isUnaryOperator(operator)) {
                  this.addToken(TokenType.UNARY_OPERATOR, operator, startPosition, this.position);
                }

                // assignment operator
                else if (this.isAssignmentOperator(operator)) {
                  this.addToken(TokenType.ASSIGNMENT_OPERATOR, operator, startPosition, this.position);
                }

                // invalid operator
                else
                  throw new Err(
                    `Invalid operator. Operator: '${operator}', at position: ${this.position}`,
                    "lexer"
                  );
              }
            }
          }

          // COMMENT
          else if (char === Sign.COMMENT) {
            // eat away whole comment until '\n'
            while (this.notEOF() && !this.isNewLine(this.at())) this.advance();
          }

          // WHITESPACE
          else if (this.isWhitespace(char)) {
            this.advance(); // skip whitespace character

            if (this.isNewLine(char)) {
              this.line++; // increment line counter
              this.column = 0; // set column back to 0
            }
          }

          // UNRECOGNIZED
          else
            throw new Err(
              `Unrecognized character found in source: '${char}' at position: ${this.position}`,
              "lexer"
            );
        }
      }
    }

    this.addToken(TokenType.EOF, "EndOfFile", this.position);

    return this.tokens;
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc append Token to `tokens` array
  @param end is optional, if not provided it defaults to `start`, easing single-character token creation*/
  private addToken(type: TokenType, value: string, start: CharPosition, end = start): void {
    this.tokens.push(new Token(type, value, start, end));
  }

  /**@return currently processed character*/
  private at(): string {
    return this.src[this.current];
  }

  /**@desc lookahead and return `next` character (in relation to currently processed one)*/
  private peek(): string {
    return this.src[this.current + 1];
  }

  /**@desc advance `current` and return previous (skipped over) character*/
  private advance(): string {
    this.column++; // increase column count due to new character being parsed

    return this.src[this.current++];
  }

  /**@desc determine whether `current` is at `EOF`*/
  private isEOF(): boolean {
    return this.current >= this.src.length;
  }

  /**@desc determine whether `current` is within `source` bounds (not at `EOF`)*/
  private notEOF(): boolean {
    return this.current < this.src.length;
  }

  /**@desc position of currently processed character*/
  private get position(): [line: number, column: number] {
    return [this.line, this.column];
  }

  /**@desc determine whether `char` is a digit*/
  private isDigit(char: string): boolean {
    return /\d/.test(char);
  }

  /**@desc determine whether `char` is alphanumeric or is an underscore*/
  private isAlpha(char: string): boolean {
    return /\w/.test(char);
  }

  /**@desc determine whether `char` is a part of binary operator / whether binary operator could consist of `char`*/
  private isPartiallyBinaryOperator(char: string): boolean {
    const binaryOperatorParts = getUniqueCharsFromStringArr(BINARY_OPERATORS);

    // '-' char in /[]/ regular expression creates range (like: /[a-z]/), so it needs to be escaped  to be treated as normal '-' character
    const escapedBinaryOperatorParts = escapeStringChars(binaryOperatorParts, "-");

    return new RegExp(`[${escapedBinaryOperatorParts}]`).test(char);
  }

  /**@desc determine whether `char` is a part of unary operator / whether unary operator could consist of `char`*/
  private isPartiallyUnaryOperator(char: string): boolean {
    const unaryOperatorParts = getUniqueCharsFromStringArr(UNARY_OPERATORS);

    return new RegExp(`[${unaryOperatorParts}]`).test(char);
  }

  /**@desc determine whether `char` is a part of assignment operator / whether assignment operator could consist of `char`*/
  private isPartiallyAssignmentOperator(char: string): boolean {
    const assignmentOperatorParts = getUniqueCharsFromStringArr(ASSIGNMENT_OPERATORS);

    // '-' char in /[]/ regular expression creates range (like: /[a-z]/), so it needs to be escaped to be treated as normal '-' character
    const escapedAssignmentOperatorParts = escapeStringChars(assignmentOperatorParts, "-");

    return new RegExp(`[${escapedAssignmentOperatorParts}]`).test(char);
  }

  /**@desc determine whether `operator` is a valid binary-operator*/
  private isBinaryOperator(operator: string): boolean {
    return BINARY_OPERATORS.some(validOperator => operator === validOperator);
  }

  /**@desc determine whether `operator` is valid a unary operator*/
  private isUnaryOperator(operator: string): boolean {
    return UNARY_OPERATORS.some(validOperator => operator === validOperator);
  }

  /**@desc determine whether `operator` is valid a assignment operator*/
  private isAssignmentOperator(operator: string): boolean {
    return ASSIGNMENT_OPERATORS.some(validOperator => operator === validOperator);
  }

  /**@desc determine whether `char` is a whitespace /[ \n\t\r]/*/
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  /**@desc determine whether `char` is a new-line '\n'*/
  private isNewLine(char: string): boolean {
    return char === "\n";
  }

  /**@desc determine whether `char` is a string-sign*/
  private isStringSign(char: string): boolean {
    return new RegExp(`[${Sign.STRING_1}${Sign.STRING_2}]`).test(char);
  }
}
