export enum TokenType {
  // LITERALS
  NUMBER = "NUMBER",

  // OTHER
  EOF = "EOF",
}

/**@desc represents `valid` language Token
@param type TokenType
@param value TokenValue (string)*/
class Token {
  constructor(public type: TokenType, public value: string) {}
}

export default class Lexer {
  /**@desc parses `sourceCode` into Token[]*/
  public tokenize(sourceCode: string): Token[] {
    /**@desc `sourceCode` character array*/
    const src = sourceCode.split("");
    const tokens: Token[] = [];

    while (src.length > 0) {
      const char = src[0];

      switch (char) {
        // HANDLE MULTICHARACTER TOKENS
        default: {
          // INT
          if (this.isInt(char)) {
            let intStr = "";

            // BUILD `intStr`
            while (src.length > 0 && this.isInt(src[0])) intStr += src.shift();

            tokens.push(new Token(TokenType.NUMBER, intStr));

            // SKIPABLE
          } else if (this.isWhitespace(char)) src.shift(); // skip whitespace character
          // UNRECOGNIZED
          else throw `Unrecognized character found in source: '${char}'`;
        }
      }
    }

    tokens.push(new Token(TokenType.EOF, "EndOfFile"));

    return tokens;
  }

  // UTILITIES

  /**@desc determine whether `char` is an int*/
  private isInt(char: string): boolean {
    return /\d/.test(char);
  }

  /**@desc determine whether `char` is a whitespace /[ \n\t\r]/*/
  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }
}
