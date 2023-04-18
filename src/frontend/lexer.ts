// PROJECT MODULES
import { Token, TokenType } from "./token";
import { Err } from "../utils";

// -----------------------------------------------
//                   KEYWORDS
// -----------------------------------------------

const KEYWORDS: Map<string, TokenType> = new Map();

KEYWORDS.set("var", TokenType.VAR);
KEYWORDS.set("const", TokenType.CONST);
KEYWORDS.set("typeof", TokenType.TYPEOF);
KEYWORDS.set("func", TokenType.FUNC);
KEYWORDS.set("return", TokenType.RETURN);
KEYWORDS.set("if", TokenType.IF);
KEYWORDS.set("else", TokenType.ELSE);
KEYWORDS.set("while", TokenType.WHILE);
KEYWORDS.set("break", TokenType.BREAK);
KEYWORDS.set("continue", TokenType.CONTINUE);
KEYWORDS.set("for", TokenType.FOR);
KEYWORDS.set("throw", TokenType.THROW);
KEYWORDS.set("try", TokenType.TRY);
KEYWORDS.set("catch", TokenType.CATCH);
KEYWORDS.set("switch", TokenType.SWITCH);
KEYWORDS.set("case", TokenType.CASE);
KEYWORDS.set("default", TokenType.DEFAULT);
KEYWORDS.set("do", TokenType.DO);

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

    this.line = this.isEOF() ? 0 : 1; // empty source has no lines
  }

  /**@desc transforms `sourceCode` into `Token[]` (performs lexical analysis)*/
  public tokenize(): Token[] {
    while (this.notEOF()) {
      const char = this.at();
      const startPosition = this.position;

      switch (char) {
        // HANDLE SINGLE-CHARACTER TOKENS

        case ";": {
          this.addSingleCharToken(TokenType.SEMICOLON, startPosition);
          break;
        }

        case ":": {
          this.addSingleCharToken(TokenType.COLON, startPosition);
          break;
        }

        case ",": {
          this.addSingleCharToken(TokenType.COMMA, startPosition);
          break;
        }

        case "?": {
          this.addSingleCharToken(TokenType.QUESTION, startPosition);
          break;
        }

        case ".": {
          this.addSingleCharToken(TokenType.DOT, startPosition);
          break;
        }

        case "(": {
          this.addSingleCharToken(TokenType.OPEN_PAREN, startPosition);
          break;
        }

        case ")": {
          this.addSingleCharToken(TokenType.CLOSE_PAREN, startPosition);
          break;
        }

        case "{": {
          this.addSingleCharToken(TokenType.OPEN_CURLY_BRACE, startPosition);
          break;
        }

        case "}": {
          this.addSingleCharToken(TokenType.CLOSE_CURLY_BRACE, startPosition);
          break;
        }

        case "[": {
          this.addSingleCharToken(TokenType.OPEN_BRACKET, startPosition);
          break;
        }

        case "]": {
          this.addSingleCharToken(TokenType.CLOSE_BRACKET, startPosition);
          break;
        }

        // HANDLE POSSIBLY MULTI-CHARACTER TOKENS

        case "=": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.EQUAL_EQUAL, "==", startPosition);
          else this.addToken(TokenType.EQUAL, "=", startPosition);

          break;
        }

        case "!": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.BANG_EQUAL, "!=", startPosition);
          else this.addToken(TokenType.BANG, "!", startPosition);

          break;
        }

        case "<": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.LESS_EQUAL, "<=", startPosition);
          else this.addToken(TokenType.LESS, "<", startPosition);

          break;
        }

        case ">": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.GREATER_EQUAL, ">=", startPosition);
          else this.addToken(TokenType.GREATER, ">", startPosition);

          break;
        }

        case "*": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.STAR_EQUAL, "*=", startPosition);
          else this.addToken(TokenType.STAR, "*", startPosition);

          break;
        }

        case "/": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.SLASH_EQUAL, "/=", startPosition);
          else this.addToken(TokenType.SLASH, "/", startPosition);

          break;
        }

        case "%": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.PERCENT_EQUAL, "%=", startPosition);
          else this.addToken(TokenType.PERCENT, "%", startPosition);

          break;
        }

        case "+": {
          this.advance();

          if (this.match("=")) this.addToken(TokenType.PLUS_EQUAL, "+=", startPosition);
          else if (this.match("+")) this.addToken(TokenType.PLUS_PLUS, "++", startPosition);
          else this.addToken(TokenType.PLUS, "+", startPosition);

          break;
        }

        case "-": {
          // handle negative numbers
          if (this.isDigit(this.peek())) {
            this.handleNumber();
            break;
          }

          this.advance();

          if (this.match("=")) this.addToken(TokenType.MINUS_EQUAL, "-=", startPosition);
          else if (this.match("-")) this.addToken(TokenType.MINUS_MINUS, "--", startPosition);
          else this.addToken(TokenType.MINUS, "-", startPosition);

          break;
        }

        case "&": {
          this.advance();

          if (this.match("&")) {
            if (this.match("=")) this.addToken(TokenType.AND_EQUAL, "&&=", startPosition);
            else this.addToken(TokenType.AND, "&&", this.position);

            break;
          }
        }

        case "|": {
          this.advance();

          if (this.match("|")) {
            if (this.match("=")) this.addToken(TokenType.OR_EQUAL, "||=", this.position);
            else this.addToken(TokenType.OR, "||", this.position);

            break;
          }
        }

        // HANDLE MULTI-CHARACTER TOKENS

        default: {
          // NUMBER
          if (this.isDigit(char)) {
            this.handleNumber();
          }

          // STRING
          else if (char === "'" || char === '"') {
            const strSign = this.advance(); // get string sign which was used for creating this string literal

            let string = "";
            let isEscaped = false; // track whether next character is escaped
            let isStrEnded = false; // track whether string ends with strSign

            // BUILD `str`
            while (this.notEOF()) {
              let char = this.advance();

              // handle escape-sign (allow for double escape-sign, like '\\' with: !isEscaped)
              if (char === "\\" && !isEscaped) {
                isEscaped = true;
                continue;
              }

              // handle escape sequences
              if (isEscaped) {
                // list of valid escapable characters (JS supported escape sequences)
                // switch statement is necessary because in JS: "\\" + "b" equals: "\\b", not: "\b"
                switch (char) {
                  case "\\":
                  case "'":
                  case '"': {
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

              string += char;
              isEscaped = false;
            }

            // make sure that string ends
            if (!isStrEnded) {
              throw new Err(
                `Invalid string literal. String: '${string}' lacks ending: (${strSign}) at position: ${this.position}`,
                "lexer"
              );
            }

            this.addToken(TokenType.STRING, string, startPosition);
          }

          // IDENTIFIER
          else if (this.isAlpha(char)) {
            let identifier = this.advance();

            // BUILD identifier
            while (this.notEOF() && this.isAlpha(this.at())) identifier += this.advance();

            // HANDLE RESERVED KEYWORDS
            const keywordType = KEYWORDS.get(identifier);

            if (keywordType) this.addToken(keywordType, identifier, startPosition);
            else this.addToken(TokenType.IDENTIFIER, identifier, startPosition);
          }

          // COMMENT
          else if (char === "#") {
            this.advance(); // advance past '#'

            const isBlockComment = this.match("#");

            // HANDLE SINGLE-LINE COMMENT
            if (isBlockComment === false) {
              // advance until newline ('\n') is encountered
              while (this.notEOF() && !this.isNewLine(this.at())) this.advance();
            }

            // HANDLE BLOCK COMMENT
            else {
              let isBlockCommentEnded = false;

              // advance until block comment end ('##') is encountered
              while (this.notEOF()) {
                // handle newline character
                if (this.isNewLine(this.at())) {
                  this.handleNewLine();
                  continue;
                }

                this.advance();

                // handle block comment end
                if (this.previous() === "#" && this.match("#")) {
                  isBlockCommentEnded = true;
                  break;
                }
              }

              // make sure that block comment ends
              if (isBlockCommentEnded === false)
                throw new Err(
                  `Invalid block comment. Missing ending '##', at position ${this.position}`,
                  "lexer"
                );
            }
          }

          // WHITESPACE
          else if (this.isWhitespace(char)) {
            // handle newline
            if (this.isNewLine(this.at())) {
              this.handleNewLine();
            }

            // handle whitespace
            else this.advance();
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

  private handleNumber() {
    const startPosition = this.position;
    let number = this.advance();

    // BUILD NUMBER
    while (this.notEOF() && this.isDigit(this.at())) number += this.advance();

    // HANDLE DECIMAL POINT
    if (this.at() === "." && this.isDigit(this.peek())) {
      number += this.advance(); // append decimal point

      // BUILD DECIMAL
      while (this.notEOF() && this.isDigit(this.at())) number += this.advance();
    }

    this.addToken(TokenType.NUMBER, number, startPosition);
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc handles newline (`'\n'`) character*/
  private handleNewLine(): void {
    this.advance(); // advance past newline

    this.line++;
    this.column = 0;
  }

  /**@desc determine whether `current` character equals `expectedChar`. In case it does, advance past `current` character. Returns corresponding boolean*/
  private match(expectedChar: string): boolean {
    if (this.isEOF() || this.at() !== expectedChar) return false;

    this.advance();

    return true;
  }

  /**@desc create new `token` and append it to `tokens` array (automatically infers token end position)*/
  private addToken(type: TokenType, value: string, start: CharPosition): void {
    const newToken = new Token(type, value, start, this.position);
    this.tokens.push(newToken);
  }

  /**@desc altered `addToken()` method. Advances `current` and uses previous (skipped over) character as token value*/
  private addSingleCharToken(type: TokenType, start: CharPosition): ReturnType<Lexer["addToken"]> {
    return this.addToken(type, this.advance(), start);
  }

  /**@return the most recently advanced (skipped over) character*/
  private previous(): string {
    return this.src[this.current - 1];
  }

  /**@return currently processed character*/
  private at(): string {
    return this.src[this.current];
  }

  /**@desc lookahead and return `next` character (in relation to `current`)*/
  private peek(): string {
    return this.src[this.current + 1];
  }

  /**@desc advance `current` and return previous (skipped over) character*/
  private advance(): string {
    this.column++; // increment column count due to new character being parsed

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

  /**@desc determine whether `char` is a whitespace (RegExp: `/[ \n\t\r]/`)*/
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  /**@desc determine whether `char` is a newline (`'\n'`)*/
  private isNewLine(char: string): boolean {
    return char === "\n";
  }
}
