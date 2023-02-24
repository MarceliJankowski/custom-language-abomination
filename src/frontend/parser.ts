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

  // varDeclaration - LEAST IMPORTANT / INVOKED FIRST / EVALUATED LAST
  // assignmentExp
  // additiveExp
  // multiplicativeExp
  // primaryExp - MOST IMPORTANT / INVOKED LAST / EVALUATED FIRST

  // -----------------------------------------------
  //                    PARSE
  // -----------------------------------------------

  private parseStatement(): AST_Statement {
    switch (this.at().type) {
      // VarDeclaration
      case TokenType.VAR:
      case TokenType.CONST:
        return this.parseVarDeclaration();

      default:
        return this.parseExpression();
    }
  }

  private parseExpression(): AST_Expression {
    return this.parseAssignmentExp();
  }

  private parseVarDeclaration(): AST_Expression {
    const varDeclarationKeyword = this.eat();
    const varDeclarationStart = varDeclarationKeyword.start;
    const isConstant = varDeclarationKeyword.type === TokenType.CONST;

    const identifier = this.eatAndExpect(
      TokenType.IDENTIFIER,
      `Invalid variable declaration. Missing identifier following: '${varDeclarationKeyword.value}'`
    ).value;

    // HANDLE UNINITIALIZED VARIABLE DECLARATION (like: 'var x')
    if (this.at().type === TokenType.SEMICOLON) {
      const uninitializedVarDeclarationEnd = this.eat().end;

      if (isConstant)
        throw new Err(
          `Invalid variable declaration. Missing initializer/value-assignment in constant variable declaration, at position: ${varDeclarationStart}`,
          "parser"
        );

      const varDeclaration: AST_VarDeclaration = {
        kind: "VarDeclaration",
        identifier,
        constant: false,
        start: varDeclarationStart,
        end: uninitializedVarDeclarationEnd,
      };

      return varDeclaration;
    }

    // HANDLE INITIALIZED VARIABLE DECLARATION (like: 'var x = 10')

    this.eatAndExpect(
      TokenType.EQUAL,
      `Invalid variable declaration. Identifier is not followed by '=' sign`
    );

    const varDeclarationValue = this.parseExpression();
    let varDeclarationEnd = varDeclarationValue.end;

    // handle optional semicolon
    if (this.at().type === TokenType.SEMICOLON) varDeclarationEnd = this.eat().end;

    const varDeclaration: AST_VarDeclaration = {
      kind: "VarDeclaration",
      identifier,
      constant: isConstant,
      value: varDeclarationValue,
      start: varDeclarationStart,
      end: varDeclarationEnd,
    };

    return varDeclaration;
  }

  private parseAssignmentExp(): AST_Expression {
    const left = this.parseAdditiveExp();
    const assignmentStart = left.start;

    if (this.at().type === TokenType.EQUAL) {
      this.eat(); // advance past equal token

      const value = this.parseAssignmentExp();
      let assignmentEnd = value.end;

      // handle optional semicolon
      if (this.at().type === TokenType.SEMICOLON) assignmentEnd = this.eat().end;

      const assignmentExp: AssignmentExp = {
        kind: "AssignmentExp",
        value,
        assigne: left,
        start: assignmentStart,
        end: assignmentEnd,
      };

      return assignmentExp;
    }

    return left;
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
        err + `\nToken: '${token.value}', expected: '${type}', at position: ${token.start}`,
        "parser"
      );

    return token;
  }
}
