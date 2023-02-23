// PROJECT MODULES
import { Token, TokenType } from "./lexer";
import { Err } from "../utils";

// -----------------------------------------------
//                    PARSER
// -----------------------------------------------

export class Parser {
  constructor(private tokens: Token[]) {}

  public buildAST(): AST_Program {
    const programBody: Pick<AST_Program, "body">["body"] = [];
    const programStart = this.tokens[0].start; // define programStart before 'tokens' array get's eaten by parser

    // BUILD AST
    while (this.notEOF()) programBody.push(this.parseStatement());

    const program: AST_Program = {
      kind: "Program",
      body: programBody,

      // handle empty-program case with 'nullish coalescing' operator
      start: programStart ?? [0, 0],
      end: this.tokens.at(-1)?.end ?? [0, 0], // last token is EOF
    };

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

      const value: AST_BinaryExp = {
        kind: "BinaryExp",
        left,
        operator,
        right,
        start: left.start,
        end: right.end,
      };

      left = value;
    }

    return left;
  }

  /**@desc parses `multiplication`, `division` and `modulo` operators*/
  private parseMultiplicativeExp() {
    let left = this.parsePrimaryExp();

    while (/[*/%]/.test(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parsePrimaryExp();

      const value: AST_BinaryExp = {
        kind: "BinaryExp",
        left,
        operator,
        right,
        start: left.start,
        end: right.end,
      };

      left = value;
    }

    return left;
  }
  /**@desc parses literal values and grouping expressions*/
  private parsePrimaryExp(): AST_Expression {
    const tokenType = this.at().type;

    switch (tokenType) {
      case TokenType.STRING: {
        const { value, start, end } = this.eat();
        const stringNode: AST_StringLiteral = { kind: "StringLiteral", value, start, end };
        return stringNode;
      }

      case TokenType.IDENTIFIER: {
        const { value, start, end } = this.eat();
        const identifierNode: AST_Identifier = { kind: "Identifier", value, start, end };
        return identifierNode;
      }

      case TokenType.NUMBER: {
        const { value, start, end } = this.eat();
        const numberNode: AST_NumericLiteral = { kind: "NumericLiteral", value: Number(value), start, end };
        return numberNode;
      }

      case TokenType.STRING: {
        const { value, start, end } = this.eat();
        const stringNode: AST_StringLiteral = { kind: "StringLiteral", value, start, end };
        return stringNode;
      }

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
        err + `\nToken: '${token.value}', at position: '${token.start}', expected: '${type}'.`,
        "parser"
      );

    return token;
  }
}
