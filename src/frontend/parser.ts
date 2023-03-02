// PROJECT MODULES
import { Token, TokenType } from "./lexer";
import {
  isRelationalOperator,
  isEqualityOperator,
  isAdditiveOperator,
  isMultiplicativeOperator,
} from "../utils";
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
  // ternaryExp
  // objectExp
  // logicalExp (OR)
  // logicalExp (AND)
  // equalityExp
  // relationalExp
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
      };

      return varDeclaration;
    }

    // HANDLE INITIALIZED VARIABLE DECLARATION (like: 'var x = 10')

    const operator = this.eatAndExpect(
      TokenType.ASSIGNMENT_OPERATOR,
      `Invalid variable declaration. Identifier is not followed by assignment operator`
    ).value;

    const varDeclarationValue = this.parseExpression();

    const varDeclaration: AST_VarDeclaration = {
      kind: "VarDeclaration",
      identifier,
      operator,
      constant: isConstant,
      value: varDeclarationValue,
      start: varDeclarationStart,
    };

    return varDeclaration;
  }

  private parseAssignmentExp(): AST_Expression {
    const left = this.parseTernaryExp();
    const assignmentStart = left.start;

    if (this.at().type === TokenType.ASSIGNMENT_OPERATOR) {
      const operator = this.eat().value;

      const value = this.parseTernaryExp();

      const assignmentExp: AssignmentExp = {
        kind: "AssignmentExp",
        assigne: left,
        operator,
        value,
        start: assignmentStart,
      };

      return assignmentExp;
    }

    return left;
  }

  private parseTernaryExp(): AST_Expression {
    let test = this.parseObjectExp();

    while (this.at().type === TokenType.TERNARY_OPERATOR) {
      this.eat(); // advance past ternary-operator

      const consequent = this.parseExpression();

      this.eatAndExpect(TokenType.COLON, "Missing ':' following consequent in ternary expression");

      const alternate = this.parseExpression();

      const ternaryExp: AST_TernaryExp = {
        kind: "TernaryExp",
        test,
        consequent,
        alternate,
        start: test.start,
      };

      test = ternaryExp;
    }

    return test;
  }

  private parseObjectExp(): AST_Expression {
    if (this.at().type !== TokenType.OPEN_CURLY_BRACE) return this.parseLogicalExpOR();

    const properties = new Array<AST_Property>();

    const objectStart = this.eat().start; // advance past OPEN_CURLY_BRACE

    // iterate as long as we're inside the object
    while (this.notEOF() && this.at().type !== TokenType.CLOSE_CURLY_BRACE) {
      const key = this.eatAndExpect(TokenType.IDENTIFIER, "Missing key inside object-literal");

      // HANDLE SHORTHANDS

      // shorthand: { key, }
      if (this.at().type === TokenType.COMMA) {
        const uninitializedProperty: AST_Property = {
          kind: "Property",
          key: key.value,
          value: undefined,
          start: key.start,
        };

        properties.push(uninitializedProperty);
        this.eat(); // advance past comma
        continue;
      }

      // shorthand: { key }
      else if (this.at().type === TokenType.CLOSE_CURLY_BRACE) {
        const uninitializedProperty: AST_Property = {
          kind: "Property",
          key: key.value,
          value: undefined,
          start: key.start,
        };

        properties.push(uninitializedProperty);
        continue;
      }

      // HANDLE DEFINED PROPERTY

      this.eatAndExpect(TokenType.COLON, "Missing ':' following identifier in object-literal"); // advance past COLON

      const value = this.parseExpression();

      // if it's not object-literal end, expect a comma for another property
      if (this.at().type !== TokenType.CLOSE_CURLY_BRACE)
        this.eatAndExpect(
          TokenType.COMMA,
          "Object-literal missing: closing curly-brace ('}') or comma (','), following property-value"
        );

      const newProperty: AST_Property = {
        kind: "Property",
        key: key.value,
        value,
        start: key.start,
      };

      properties.push(newProperty);
    }

    // HANDLE OBJECT

    this.eatAndExpect(TokenType.CLOSE_CURLY_BRACE, "Missing closing curly-brace ('}') inside object-literal");

    const objectLiteral: AST_ObjectLiteral = {
      kind: "ObjectLiteral",
      properties,
      start: objectStart,
    };

    return objectLiteral;
  }

  /**@desc parses logical `OR` operator*/
  private parseLogicalExpOR(): AST_Expression {
    let left = this.parseLogicalExpAND();

    while (this.at().value === "||") {
      const operator = this.eat().value;
      const right = this.parseLogicalExpAND();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parses logical `AND` operator*/
  private parseLogicalExpAND(): AST_Expression {
    let left = this.parseEqualityExp();

    while (this.at().value === "&&") {
      const operator = this.eat().value;
      const right = this.parseEqualityExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parses binary expression `equality` operators*/
  private parseEqualityExp(): AST_Expression {
    let left = this.parseRelationalExp();

    while (isEqualityOperator(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parseRelationalExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parses binary expression `relational` operators*/
  private parseRelationalExp(): AST_Expression {
    let left = this.parseAdditiveExp();

    while (isRelationalOperator(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parseAdditiveExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parses `addition` and `subtraction` operators*/
  private parseAdditiveExp(): AST_Expression {
    let left = this.parseMultiplicativeExp();

    // here's the problem
    while (isAdditiveOperator(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parseMultiplicativeExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parses `multiplication`, `division` and `modulo` operators*/
  private parseMultiplicativeExp(): AST_Expression {
    let left = this.parsePrefixUnaryExp();

    while (isMultiplicativeOperator(this.at().value)) {
      const operator = this.eat().value;
      const right = this.parsePrefixUnaryExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parse `prefix` unary expressions (like: ++var)*/
  private parsePrefixUnaryExp(): AST_Expression {
    while (this.at().type === TokenType.UNARY_OPERATOR) {
      const operator = this.eat();
      const operand = operator.value === "typeof" ? this.parseExpression() : this.parsePostfixUnaryExp();

      const unaryExp: AST_PrefixUnaryExp = {
        kind: "PrefixUnaryExp",
        operand,
        operator: operator.value,
        start: operator.start,
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
        start: left.start,
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
        const stringNode: AST_StringLiteral = { kind: "StringLiteral", value, start, end: end! };
        return stringNode;
      }

      case TokenType.IDENTIFIER: {
        const { value, start } = this.eat();
        const identifierNode: AST_Identifier = { kind: "Identifier", value, start };
        return identifierNode;
      }

      case TokenType.NUMBER: {
        const { value, start } = this.eat();
        const numberNode: AST_NumericLiteral = { kind: "NumericLiteral", value: Number(value), start };
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

  /**@desc helper function for parsing binary-expressions. It generates and returns `AST Binary Expression` node*/
  private generateASTBinaryExpNode(
    left: AST_Expression,
    operator: string,
    right: AST_Expression
  ): AST_BinaryExp {
    const astBinaryExp: AST_BinaryExp = {
      kind: "BinaryExp",
      left,
      operator,
      right,
      start: left.start,
    };

    return astBinaryExp;
  }

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
