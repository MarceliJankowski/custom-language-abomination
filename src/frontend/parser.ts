// PROJECT MODULES
import { Token, TokenType } from "./lexer";
import { Err } from "../utils";

// -----------------------------------------------
//                    PARSER
// -----------------------------------------------

export class Parser {
  constructor(private tokens: Token[]) {}

  public buildAST(): AST_Program {
    const program: AST_Program = {
      kind: "Program",
      body: [],
    };

    // BUILD AST
    while (this.notEOF()) program.body.push(this.parseStatement());

    return program;
  }

  // -----------------------------------------------
  //             ORDER OF OPERATIONS
  // -----------------------------------------------
  // From least to most important:

  // additiveExp -  LEAST IMPORTANT / INVOKED FIRST / EVALUATED LAST
  // multiplicativeExp
  // primaryExp -  MOST IMPORTANT / INVOKED LAST / EVALUATED FIRST

  // -----------------------------------------------
  //                    PARSE
  // -----------------------------------------------

  private parseStatement(): AST_Statement {
    return this.parseExpression();
  }

  private parseExpression(): AST_Expression {
    return this.parseAdditiveExp();
  }

  /**@desc parses `addition` and `subtraction` operators*/
  private parseAdditiveExp(): AST_Expression {
    let left = this.parseMultiplicativeExp();

    while (/[-+]/.test(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parseMultiplicativeExp();

      left = {
        kind: "BinaryExp",
        left,
        operator,
        right,
      } as AST_BinaryExp;
    }

    return left;
  }

  /**@desc parses `multiplication`, `division` and `modulo` operators*/
  private parseMultiplicativeExp() {
    let left = this.parsePrimaryExp();

    while (/[*/%]/.test(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parsePrimaryExp();

      left = {
        kind: "BinaryExp",
        left,
        operator,
        right,
      } as AST_BinaryExp;
    }

    return left;
  }
  /**@desc parses literal values and grouping expressions*/
  private parsePrimaryExp(): AST_Expression {
    const tokenType = this.at().type;

    switch (tokenType) {
      case TokenType.IDENTIFIER:
        return { kind: "Identifier", symbol: this.eat().value } as AST_Identifier;

      case TokenType.NUMBER:
        return { kind: "NumericLiteral", value: Number(this.eat().value) } as AST_NumericLiteral;

      case TokenType.OPEN_PAREN: {
        this.eat(); // advance past open-paren

        const value = this.parseExpression();

        this.eatAndExpect(TokenType.CLOSE_PAREN, "Unexpected token found inside parenthesised expression");

        return value;
      }

      // UNIDENTIFIED TOKENS AND INVALID CODE
      default:
        throw new Err(
          `Unexpected token found during parsing, token: '${this.at().value}', at position: ${
            this.at().start
          }`,
          "parser"
        );
    }
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc determine whether EOF (End Of File) token is reached*/
  private notEOF(): boolean {
    return this.at().type !== TokenType.EOF;
  }

  /**@desc return current `token`*/
  private at(): Token {
    return this.tokens[0];
  }

  /**@desc advances `token` list (shifts current token) and returns previous (shifted) token*/
  private eat(): Token {
    return this.tokens.shift()!;
  }

  /**@desc extended `eat()` method with added token type-check and token presence-check*/
  private eatAndExpect(type: TokenType, err: string): Token | never {
    const token = this.eat();

    if (!token || token.type !== type)
      throw new Err(
        err + `\nAt position: ${token.start}, token: '${token.value}', expected: '${type}'`,
        "parser"
      );

    return token;
  }
}
