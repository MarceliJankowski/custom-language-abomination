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
  private programBody: AST_Program["body"] = [];

  constructor(private tokens: Token[]) {}

  public buildAST(): AST_Program {
    const programStart = this.tokens[0].start; // define programStart before 'tokens' array get's eaten by parser

    // BUILD AST
    while (this.notEOF()) this.programBody.push(this.parseStatement());

    const program: AST_Program = {
      kind: "Program",
      body: this.programBody,

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

  // varDeclaration - LEAST IMPORTANT / INVOKED FIRST
  // funcDeclaration
  // returnStatement
  // assignmentExp
  // ternaryExp
  // objectExp
  // arrayExp
  // logicalExp (OR)
  // logicalExp (AND)
  // equalityExp
  // relationalExp
  // additiveExp
  // multiplicativeExp
  // prefixUnaryExp
  // postfixUnaryExp
  // CallExp
  // MemberExp
  // primaryExp - MOST IMPORTANT / INVOKED LAST

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

      case TokenType.FUNC: {
        parsedStatement = this.parseFuncDeclaration();
        break;
      }

      case TokenType.RETURN: {
        parsedStatement = this.parseReturnStatement();
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
      end: varDeclarationValue.end,
    };

    return varDeclaration;
  }

  private parseBlockStatement(): AST_BlockStatement {
    const start = this.eatAndExpect(
      TokenType.OPEN_CURLY_BRACE,
      "Invalid block statement. Missing openining curly-brace ('{')"
    ).start;

    const body: AST_Statement[] = [];

    // BUILD body
    while (this.notEOF() && this.at().type !== TokenType.CLOSE_CURLY_BRACE) body.push(this.parseStatement());

    const end = this.eatAndExpect(
      TokenType.CLOSE_CURLY_BRACE,
      "Invalid block statement. Missing closing curly-brace ('}')"
    ).end;

    const blockStatement: AST_BlockStatement = {
      kind: "BlockStatement",
      body,
      start,
      end,
    };

    return blockStatement;
  }

  private parseFuncDeclaration(): AST_FunctionDeclaration {
    const funcStart = this.eat().start; // advance past 'func' keyword

    const name = this.eatAndExpect(
      TokenType.IDENTIFIER,
      "Invalid function declaration. Missing function name following func keyword"
    ).value;

    // HANDLE PARAMETERS
    const { argumentList } = this.parseArgumentList();

    // make sure that each parameter is an identifier
    argumentList.forEach(arg => {
      if (arg.kind !== "Identifier")
        throw new Err(
          `Invalid function declaration. Invalid parameter: '${arg.kind}' (only identifiers are valid) at position: ${arg.start}`,
          "parser"
        );
    });

    const parameters = argumentList as AST_Identifier[];

    // HANDLE BODY
    const blockStatement = this.parseBlockStatement();

    // BUILD FUNC
    const func: AST_FunctionDeclaration = {
      kind: "FunctionDeclaration",
      body: blockStatement,
      name,
      parameters,
      start: funcStart,
      end: blockStatement.end,
    };

    return func;
  }

  private parseReturnStatement(): AST_ReturnStatement {
    const returnKeyword = this.eat();

    let argument;

    // handle case when there's a return value
    if (this.isCurrentTokenFollowing(returnKeyword)) argument = this.parseStatement();

    // BUILD returnStatement
    const returnStatement: AST_ReturnStatement = {
      kind: "ReturnStatement",
      argument,
      start: returnKeyword.start,
      end: argument?.end ?? returnKeyword.end,
    };

    return returnStatement;
  }

  private parseAssignmentExp(): AST_Expression {
    const left = this.parseTernaryExp();
    const assignmentStart = left.start;

    if (this.at().type === TokenType.ASSIGNMENT_OPERATOR) {
      const operator = this.eat().value;

      const value = this.parseTernaryExp();

      const assignmentExp: AST_AssignmentExp = {
        kind: "AssignmentExp",
        assigne: left,
        operator,
        value,
        start: assignmentStart,
        end: value.end,
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
        end: alternate.end,
      };

      test = ternaryExp;
    }

    return test;
  }

  private parseObjectExp(): AST_Expression {
    if (this.at().type !== TokenType.OPEN_CURLY_BRACE) return this.parseArrayExp();

    const objectStart = this.eat().start; // advance past OPEN_CURLY_BRACE
    const properties = new Array<AST_ObjectProperty>();

    // iterate as long as we're inside the object
    while (this.notEOF() && this.at().type !== TokenType.CLOSE_CURLY_BRACE) {
      const key = this.eatAndExpect(TokenType.IDENTIFIER, "Missing key inside object-literal");

      // HANDLE SHORTHANDS

      // shorthand: { key, }
      if (this.at().type === TokenType.COMMA) {
        const uninitializedProperty: AST_ObjectProperty = {
          kind: "ObjectProperty",
          key: key.value,
          value: undefined,
          start: key.start,
          end: key.end,
        };

        properties.push(uninitializedProperty);
        this.eat(); // advance past comma
        continue;
      }

      // shorthand: { key }
      else if (this.at().type === TokenType.CLOSE_CURLY_BRACE) {
        const uninitializedProperty: AST_ObjectProperty = {
          kind: "ObjectProperty",
          key: key.value,
          value: undefined,
          start: key.start,
          end: key.end,
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

      const newProperty: AST_ObjectProperty = {
        kind: "ObjectProperty",
        key: key.value,
        value,
        start: key.start,
        end: value.end,
      };

      properties.push(newProperty);
    }

    // HANDLE OBJECT

    const objectEnd = this.eatAndExpect(
      TokenType.CLOSE_CURLY_BRACE,
      "Missing closing curly-brace ('}') inside object-literal"
    ).end;

    const objectLiteral: AST_ObjectLiteral = {
      kind: "ObjectLiteral",
      properties,
      start: objectStart,
      end: objectEnd,
    };

    // handle immediately following member-expression
    if (this.isCurrentTokenAccessingProperty()) return this.parseMemberExp(objectLiteral);

    return objectLiteral;
  }

  private parseArrayExp(): AST_Expression {
    if (this.at().type !== TokenType.OPEN_BRACKET) return this.parseLogicalExpOR();

    const elements = new Array<AST_Expression>();
    const arrayStart = this.eat().start; // advance past OPEN_BRACKET

    while (this.notEOF() && this.at().type !== TokenType.CLOSE_BRACKET) {
      const element = this.parseExpression();

      if (this.at().type === TokenType.COMMA) this.eat(); // advance past comma

      elements.push(element);
    }

    const arrayEnd = this.eatAndExpect(
      TokenType.CLOSE_BRACKET,
      "Missing closing bracket (']') following element in array-literal"
    ).end;

    const arrayLiteral: AST_ArrayLiteral = {
      kind: "ArrayLiteral",
      elements,
      start: arrayStart,
      end: arrayEnd,
    };

    // handle immediately following member-expression
    if (this.isCurrentTokenAccessingProperty()) return this.parseMemberExp(arrayLiteral);

    return arrayLiteral;
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
        end: operand.end,
      };

      return unaryExp;
    }

    return this.parsePostfixUnaryExp();
  }

  /**@desc parse `postfix` unary expressions (like: var++)*/
  private parsePostfixUnaryExp(): AST_Expression {
    const left = this.parseCallExp();

    while (this.at().type === TokenType.UNARY_OPERATOR) {
      const operator = this.eat();

      const unaryExp: AST_PostfixUnaryExp = {
        kind: "PostfixUnaryExp",
        operator: operator.value,
        operand: left,
        start: left.start,
        end: left.end,
      };

      return unaryExp;
    }

    return left;
  }

  private parseCallExp(): AST_Expression {
    const callee = this.parseMemberExp();
    if (this.at().type !== TokenType.OPEN_PAREN) return callee;

    // HANDLE ARGUMENTS
    const { argumentList, argumentListEnd } = this.parseArgumentList();

    // BUILD CALL-EXP
    let callExp: AST_CallExp = {
      kind: "CallExp",
      callee,
      arguments: argumentList,
      start: callee.start,
      end: argumentListEnd,
    };

    // handle another call-expression immediately following current callExp (example: 'func()()')
    if (this.at().type === TokenType.OPEN_PAREN) callExp = this.parseCallExp() as AST_CallExp;

    return callExp;
  }

  private parseArgumentList() {
    this.eatAndExpect(TokenType.OPEN_PAREN, "Invalid argument list. Missing opening parentheses ('(')");

    const argumentList: AST_Expression[] = [];

    // handle case when there are arguments
    if (this.at().type !== TokenType.CLOSE_PAREN) {
      const handleArgument = () => {
        const arg = this.parseAssignmentExp();
        argumentList.push(arg);
      };

      // handle first argument
      handleArgument();

      // handle next arguments
      while (this.at().type === TokenType.COMMA) {
        this.eat(); // advance past comma
        handleArgument();
      }
    }

    const argumentListEnd = this.eatAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid argument list. Missing closing parentheses (')')"
    ).end;

    return {
      argumentList,
      argumentListEnd,
    };
  }

  private parseMemberExp(expObject?: AST_ArrayLiteral | AST_ObjectLiteral): AST_Expression {
    let object: AST_Expression;

    if (expObject) object = expObject; // enable: '[1,2,3][0]', '{}.type' and so on
    else object = this.parsePrimaryExp();

    while (this.isCurrentTokenAccessingProperty() && this.isCurrentTokenFollowing(object)) {
      const operator = this.eat(); // '.' or '[' for computed expressions

      let property: AST_Expression;
      let computed = false;

      // NON-COMPUTED (obj.property)
      if (operator.type === TokenType.DOT) {
        property = this.parsePrimaryExp();

        if (property.kind !== "Identifier")
          throw new Err(
            `Invalid member-expression. Property kind: '${property.kind}' is not an identifier (only identifiers can follow '.' operator), at position ${property.start}`,
            "parser"
          );
      }

      // COMPUTED (obj["key"])
      else if (operator.type === TokenType.OPEN_BRACKET) {
        computed = true;
        property = this.parseExpression(); // not checking property kind as there are many expression that could evaluate to valid identifier
        this.eatAndExpect(
          TokenType.CLOSE_BRACKET,
          "Missing closing bracket (']') inside computed member-expression"
        );
      }

      // INVALID OPERATOR
      else
        throw new Err(
          `Invalid member-expression. Invalid operator: '${operator.value}', at position ${operator.start}`,
          "parser"
        );

      const memberExp: AST_MemberExp = {
        kind: "MemberExp",
        object,
        property,
        computed,
        start: object.start,
        end: property.end,
      };

      object = memberExp;
    }

    return object;
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
  /**@desc determine whether current token is accessing property / whether current token is a: `'.'` or `'['`*/
  private isCurrentTokenAccessingProperty() {
    return this.at().type === TokenType.DOT || this.at().type === TokenType.OPEN_BRACKET;
  }

  /**@desc determine whether currentToken is following preceding `Token/Node` (both are on the same line, and currentToken starts after preceding `Token/Node` ends)*/
  private isCurrentTokenFollowing(preceding: Token | AST_Expression) {
    const precedingTokenEnd = preceding.end;
    const currentTokenStart = this.at().start;

    const areOnTheSameLine = precedingTokenEnd[0] === currentTokenStart[0];
    const doesCurrentTokenStartAfterPrecedingTokenEnds = currentTokenStart[1] > precedingTokenEnd[1];

    return areOnTheSameLine && doesCurrentTokenStartAfterPrecedingTokenEnds;
  }

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
      end: right.end,
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
