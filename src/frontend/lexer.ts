export enum TokenType {
  // LITERALS
  NUMBER = "NUMBER",

  // OTHER
  EOF = "EOF",
}

enum Sign {
  COMMENT = "#",
}

type TokenPosition = [row: number, column: number];

/**@desc represents `valid` language Token
@param type TokenType
@param value TokenValue (string)*/
class Token {
  constructor(
    public type: TokenType,
    public value: string,
    public start: TokenPosition,
    public end: TokenPosition
  ) {}
}

export default class Lexer {
  /**@desc `sourceCode` character array*/
  private src: string[];

  private tokens: Token[];

  /**@desc tracks current character row*/
  private row: number;
  /**@desc tracks current character column*/
  private column: number;

  constructor(sourceCode: string) {
    this.src = sourceCode.split("");
    this.tokens = new Array<Token>();

    this.row = this.isSrcNotEmpty() ? 1 : 0;
    this.column = 0; // tokenize will increment column to 1 by default
  }

  /**@desc parses `sourceCode` into Token[]*/
  public tokenize(): Token[] {
    while (this.isSrcNotEmpty()) {
      const char = this.at();
      this.column++; // increment column because new character is being parsed

      switch (char) {
        // HANDLE MULTICHARACTER TOKENS
        default: {
          // INT
          if (this.isInt(char)) {
            const startPosition: TokenPosition = this.getCurrentPosition();
            let intStr = this.eat();

            // BUILD `intStr`
            while (this.isSrcNotEmpty() && this.isInt(this.at())) {
              intStr += this.eat();
              this.column++;
            }

            this.addToken(TokenType.NUMBER, intStr, startPosition, this.getCurrentPosition());
          }

          // COMMENT
          else if (char === Sign.COMMENT) {
            // eat away whole comment until '\n'
            while (this.isSrcNotEmpty() && !this.isNewLine(this.at())) this.eat();
          }

          // WHITESPACE
          else if (this.isWhitespace(char)) {
            if (this.isNewLine(char)) {
              this.row++; // if character is a new-line increment row counter
              this.column = 0; // set column back to 0
            }

            this.eat(); // skip whitespace character
          }

          // UNRECOGNIZED
          else
            throw `Unrecognized character found in source: '${char}' at position: ${this.getCurrentPosition()}`;
        }
      }
    }

    this.addToken(TokenType.EOF, "EndOfFile", this.getCurrentPosition(), this.getCurrentPosition());

    return this.tokens;
  }

  // UTILITIES

  /**@desc append Token to `tokens` array*/
  private addToken(type: TokenType, value: string, start: TokenPosition, end: TokenPosition): void {
    this.tokens.push(new Token(type, value, start, end));
  }

  /**@return currently processed `src` character*/
  private at(): string {
    return this.src[0];
  }

  /**@desc shift current character from `src` and return it*/
  private eat(): string {
    if (!this.isSrcNotEmpty()) throw "Lexer internal error: cannot eat when src is empty!";

    return this.src.shift()!;
  }

  /**@desc determine whether `src` is empty*/
  private isSrcNotEmpty(): boolean {
    return this.src.length > 0;
  }

  private getCurrentPosition(): TokenPosition {
    return [this.row, this.column];
  }

  /**@desc determine whether `char` is an int*/
  private isInt(char: string): boolean {
    return /\d/.test(char);
  }

  /**@desc determine whether `char` is a whitespace /[ \n\t\r]/*/
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isNewLine(char: string): boolean {
    return char === "\n";
  }
}
