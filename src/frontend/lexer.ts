// PROJECT MODULES
import { Err } from "../utils";

// -----------------------------------------------
//                    STUFF
// -----------------------------------------------

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
  LET = "LET",
  CONST = "CONST",

  // OPERATORS
  OPEN_PAREN = "(",
  CLOSE_PAREN = ")",
  BINARY_OPERATOR = "BINARY_OPERATOR",

  // OTHER
  EOF = "EOF",
}

const KEYWORDS: { [key: string]: TokenType } = {
  let: TokenType.LET,
  const: TokenType.CONST,
};

/**@desc represents `valid` language Token
@param type TokenType
@param value TokenValue (string)*/
export class Token {
  constructor(
    public type: TokenType,
    public value: string,
    public line: number,
    public start: CharPosition,
    public end: CharPosition
  ) {}
}

// -----------------------------------------------
//                    LEXER
// -----------------------------------------------

export class Lexer {
  /**@desc `sourceCode` character array*/
  private src: string[];

  private tokens: Token[];

  /**@desc tracks current-character line*/
  private line: number;
  /**@desc tracks current-character column*/
  private column: number;

  constructor(sourceCode: string) {
    this.src = sourceCode.split("");
    this.tokens = new Array<Token>();

    this.line = this.isSrcNotEmpty() ? 1 : 0;
    this.column = 0; // tokenize will increment column to 1 by default
  }

  /**@desc parses `sourceCode` into Token[]*/
  public tokenize(): Token[] {
    while (this.isSrcNotEmpty()) {
      const char = this.at();
      this.column++; // increment column because new character is being parsed

      switch (char) {
        // HANDLE SINGLE-CHARACTER TOKENS

        case "(": {
          this.addToken(TokenType.OPEN_PAREN, this.eat(), this.position);
          break;
        }

        case ")": {
          this.addToken(TokenType.CLOSE_PAREN, this.eat(), this.position);
          break;
        }

        // BINARY OPERATORS
        case "+":
        case "-":
        case "*":
        case "%":
        case "/": {
          this.addToken(TokenType.BINARY_OPERATOR, this.eat(), this.position);
          break;
        }

        // HANDLE MULTI-CHARACTER TOKENS
        default: {
          // INT
          if (this.isInt(char)) {
            const startPosition = this.position;
            let value = this.eat();

            // BUILD `intStr`
            while (this.isSrcNotEmpty() && this.isInt(this.at())) {
              value += this.eat();
              this.column++;
            }

            this.addToken(TokenType.NUMBER, value, startPosition, this.position);
          }

          // STRING
          else if (this.isStringSign(char)) {
            const startPosition = this.position;
            const strSign = this.eat(); // get string-sign which was used for creating this string literal

            let value = "";
            let isEscaped = false; // track whether next character is escaped
            let isStrEnded = false; // track whether string ends with strSign

            // BUILD `str`
            while (this.isSrcNotEmpty()) {
              let char = this.eat();
              this.column++;

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
                `String: '${value}' lacks ending: ${strSign} at position: ${this.position}`,
                "lexer"
              );
            }

            this.addToken(TokenType.STRING, value, startPosition, this.position);
          }

          // IDENTIFIER
          else if (this.isAlpha(char)) {
            const startPosition = this.position;
            let identifier = "";

            // BUILD identifier
            while (this.isSrcNotEmpty() && this.isAlpha(this.at())) {
              identifier += this.eat();
              this.column++;
            }

            // HANDLE RESERVED KEYWORDS
            const keywordType = KEYWORDS[identifier];

            if (keywordType) this.addToken(keywordType, identifier, startPosition, this.position);
            else this.addToken(TokenType.IDENTIFIER, identifier, startPosition, this.position);
          }

          // COMMENT
          else if (char === Sign.COMMENT) {
            // eat away whole comment until '\n'
            while (this.isSrcNotEmpty() && !this.isNewLine(this.at())) this.eat();
          }

          // WHITESPACE
          else if (this.isWhitespace(char)) {
            if (this.isNewLine(char)) {
              this.line++; // if character is a new-line increment line counter
              this.column = 0; // set column back to 0
            }

            this.eat(); // skip whitespace character
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
    this.tokens.push(new Token(type, value, this.line, start, end));
  }

  /**@return currently processed `src` character*/
  private at(): string {
    return this.src[0];
  }

  /**@desc shift current character from `src` and return it*/
  private eat(): string {
    if (!this.isSrcNotEmpty())
      throw new Err("Lexer internal error: cannot eat when src is empty!", "internal");

    return this.src.shift()!;
  }

  /**@desc determine whether `src` is empty*/
  private isSrcNotEmpty(): boolean {
    return this.src.length > 0;
  }

  /**@desc position of currently processed character*/
  private get position(): [line: number, column: number] {
    return [this.line, this.column];
  }

  /**@desc determine whether `char` is an int*/
  private isInt(char: string): boolean {
    return /\d/.test(char);
  }

  /**@desc determine whether `char` is alphanumeric or is an underscore*/
  private isAlpha(char: string): boolean {
    return /\w/.test(char);
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
