// PROJECT MODULES
import { Token, TokenType, isLogicalBinaryOperator } from "./lexer";
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
  // helpful web page: https://en.cppreference.com/w/cpp/language/operator_precedence

  // varDeclaration - LEAST IMPORTANT / INVOKED FIRST / EVALUATED LAST
  // assignmentExp
  // logicalExp
  // additiveExp
  // multiplicativeExp
  // prefixUnaryExp
  // postfixUnaryExp
  // primaryExp - MOST IMPORTANT / INVOKED LAST / EVALUATED FIRST

  // -----------------------------------------------
  //                    PARSE
  // -----------------------------------------------

  private parseStatement(): AST_Statement {
    let parsedStatement: AST_Statement;

    switch (this.at().type) {
      // STATEMENTS
      case TokenType.VAR:
      case TokenType.CONST: {
        parsedStatement = this.parseVarDeclaration();
        break;
      }

      // EXPRESSIONS
      default:
        return this.parseExpression();
    }

    // HANDLE OPTIONAL SEMICOLON
    if (this.at().type === TokenType.SEMICOLON) this.eat();

    return parsedStatement;
  }

  private parseExpression(): AST_Expression {
    const parsedExpression = this.parseAssignmentExp();

    // HANDLE OPTIONAL SEMICOLON
    if (this.at().type === TokenType.SEMICOLON) this.eat();

    return parsedExpression;
  }

  private parseVarDeclaration(): AST_Statement {
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

    const varDeclaration: AST_VarDeclaration = {
      kind: "VarDeclaration",
      identifier,
      constant: isConstant,
      value: varDeclarationValue,
      start: varDeclarationStart,
      end: varDeclarationValue.end,
    };

    return varDeclaration;
  }

  private parseAssignmentExp(): AST_Expression {
    const left = this.parseLogicalExp();
    const assignmentStart = left.start;

    if (this.at().type === TokenType.EQUAL) {
      this.eat(); // advance past equal token

      const value = this.parseLogicalExp();

      const assignmentExp: AssignmentExp = {
        kind: "AssignmentExp",
        assigne: left,
        value,
        start: assignmentStart,
        end: value.end,
      };

      return assignmentExp;
    }

    return left;
  }

  /**@desc parses binary expression `relational/logical` operators*/
  private parseLogicalExp(): AST_Expression {
    let left = this.parseAdditiveExp();

    while (isLogicalBinaryOperator(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parseAdditiveExp();

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
  private parseMultiplicativeExp(): AST_Expression {
    let left = this.parsePrefixUnaryExp();

    while (/[*/%]/.test(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parsePrefixUnaryExp();

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

  /**@desc parse `prefix` unary expressions (like: ++var)*/
  private parsePrefixUnaryExp(): AST_Expression {
    while (this.at().type === TokenType.UNARY_OPERATOR) {
      const operator = this.eat();
      const operand = this.parsePostfixUnaryExp();

      const unaryExp: AST_PrefixUnaryExp = {
        kind: "PrefixUnaryExp",
        operand,
        operator: operator.value,
        start: operator.start,
        end: operand.end,
      };

      return unaryExp;
    }

    return this.parsePostfixUnaryExp();
  }

  /**@desc parse `postfix` unary expressions (like: var++)*/
  private parsePostfixUnaryExp(): AST_Expression {
    const left = this.parsePrimaryExp();

    while (this.at().type === TokenType.UNARY_OPERATOR) {
      const operator = this.eat();

      const unaryExp: AST_PostfixUnaryExp = {
        kind: "PostfixUnaryExp",
        operator: operator.value,
        operand: left,
        start: operator.start,
        end: left.end,
      };

      return unaryExp;
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
