// PROJECT MODULES
import { Token, TokenType } from "./lexer";
import {
  Err,
  isRelationalOperator,
  isEqualityOperator,
  isAdditiveOperator,
  isMultiplicativeOperator,
} from "../utils";

// -----------------------------------------------
//                    PARSER
// -----------------------------------------------
// recursive descent parser implementation

export class Parser {
  private programBody: AST_Program["body"] = [];

  /**@desc `index` of currently processed token*/
  private current: number = 0;

  constructor(private tokens: Token[]) {}

  public buildAST(): AST_Program {
    const programStart = this.tokens[0].start; // define programStart before 'tokens' array get's eaten by parser

    // BUILD AST
    while (this.notEOF()) {
      const statement = this.parseStatement();

      // HANDLE OPTIONAL SEMICOLON
      if (this.at().type === TokenType.SEMICOLON) this.advance();

      this.programBody.push(statement);
    }

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

  // statements - LEAST IMPORTANT / INVOKED FIRST
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

      case TokenType.IF: {
        parsedStatement = this.parseIfStatement();
        break;
      }

      case TokenType.WHILE: {
        parsedStatement = this.parseWhileStatement();
        break;
      }

      case TokenType.BREAK: {
        parsedStatement = this.parseBreakStatement();
        break;
      }

      case TokenType.CONTINUE: {
        parsedStatement = this.parseContinueStatement();
        break;
      }

      case TokenType.FOR: {
        parsedStatement = this.parseForStatement();
        break;
      }

      // EXPRESSIONS
      default:
        return this.parseExpression();
    }

    return parsedStatement;
  }

  private parseExpression(): AST_Expression {
    return this.parseFuncExpression();
  }

  private parseVarDeclaration(): AST_Statement {
    const varDeclarationKeyword = this.advance();
    const varDeclarationStart = varDeclarationKeyword.start;
    const isConstant = varDeclarationKeyword.type === TokenType.CONST;

    const identifier = this.advanceAndExpect(
      TokenType.IDENTIFIER,
      `Invalid variable declaration. Missing identifier following: '${varDeclarationKeyword.value}'`
    ).value;

    // HANDLE UNINITIALIZED VARIABLE DECLARATION (like: 'var x')
    if (this.at().type === TokenType.SEMICOLON) {
      const uninitializedVarDeclarationEnd = this.advance().end;

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

    const operator = this.advanceAndExpect(
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
    const start = this.advanceAndExpect(
      TokenType.OPEN_CURLY_BRACE,
      "Invalid block statement. Missing openining curly-brace ('{')"
    ).start;

    const body: AST_Statement[] = [];

    // BUILD body
    while (this.notEOF() && this.at().type !== TokenType.CLOSE_CURLY_BRACE) body.push(this.parseStatement());

    const end = this.advanceAndExpect(
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
    const funcStart = this.advance().start; // advance past 'func' keyword

    const name = this.advanceAndExpect(
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
    const returnKeyword = this.advance();

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

  private parseIfStatement(): AST_IfStatement {
    const start = this.advance().start; // advance past 'if' keyword

    // HANDLE TEST
    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid if statement. Missing opening parentheses ('(') following 'if' keyword"
    );

    const test = this.parseExpression();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid if statement. Missing closing parentheses (')') following test"
    );

    // HANDLE CONSEQUENT
    let consequent;

    if (this.at().type === TokenType.OPEN_CURLY_BRACE) consequent = this.parseBlockStatement();
    else consequent = this.parseStatement(); // enable one-liners

    // HANDLE ALTERNATE
    let alternate;

    if (this.at().type === TokenType.ELSE) {
      this.advance(); // advance past 'else' keyword

      if (this.at().type === TokenType.OPEN_CURLY_BRACE) alternate = this.parseBlockStatement();
      else alternate = this.parseStatement(); // enable one-liners
    }

    // BUILD IfStatement
    const ifStatement: AST_IfStatement = {
      kind: "IfStatement",
      test,
      consequent,
      alternate,
      start,
      end: alternate?.end ?? consequent.end,
    };

    return ifStatement;
  }

  private parseWhileStatement(): AST_WhileStatement {
    const start = this.advance().start; // advance past 'while' keyword

    // HANDLE TEST
    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid while statement. Missing opening parentheses ('(') following 'while' keyword"
    );

    const test = this.parseExpression();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid while statement. Missing closing parentheses (')') following test"
    );

    // HANDLE BODY
    let body;

    if (this.at().type === TokenType.OPEN_CURLY_BRACE) body = this.parseBlockStatement();
    else body = this.parseStatement(); // enable one-liners

    // BUILD WhileStatement
    const whileStatement: AST_WhileStatement = {
      kind: "WhileStatement",
      test,
      body,
      start,
      end: body.end,
    };

    return whileStatement;
  }

  private parseForStatement(): AST_Statement {
    const forKeyword = this.advance();

    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid for statement. Missing opening parentheses ('(') following 'for' keyword"
    );

    // HANDLE INITIALIZER
    let initializer;

    // allow initializer omission
    if (this.at().type === TokenType.SEMICOLON) {
      initializer = undefined;
    }

    // initializer as variable declaration
    else if (this.at().type === TokenType.CONST || this.at().type === TokenType.VAR) {
      initializer = this.parseVarDeclaration();
    }

    // initializer as expression
    else initializer = this.parseExpression();

    this.advanceAndExpect(
      TokenType.SEMICOLON,
      "Invalid for statement. Missing semicolon (';') delimiter following initializer"
    );

    // HANDLE TEST
    let test;

    // allow test omission
    if (this.at().type !== TokenType.SEMICOLON) test = this.parseExpression();

    this.advanceAndExpect(
      TokenType.SEMICOLON,
      "Invalid for statement. Missing semicolon (';') delimiter following test"
    );

    // HANDLE UPDATE
    let update;

    // allow update omission
    if (this.at().type !== TokenType.CLOSE_PAREN) update = this.parseExpression();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid for statement. Missing closing parentheses (')') following update"
    );

    // HANDLE BODY
    let body;

    if (this.at().type === TokenType.OPEN_CURLY_BRACE) body = this.parseBlockStatement();
    else body = this.parseStatement(); // enable one-liners

    // DESUGARING
    // forStatement doesn't introduce any "new" capabilities to the language, it can be fully implemented with already defined AST_NODES
    // therefore, I treat it as syntactic-sugar. Here I'm desugaring forStatement (breaking it up) into its primary components / AST_NODES

    if (update) {
      const bodyWithUpdate: AST_BlockStatement = {
        kind: "BlockStatement",
        body: [body, update],
        start: body.start,
        end: body.end,
      };

      body = bodyWithUpdate;
    }

    if (test === undefined) {
      const defaultTestValue: AST_Identifier = {
        kind: "Identifier",
        value: "true",
        start: forKeyword.start,
        end: forKeyword.end,
      };

      test = defaultTestValue;
    }

    const bodyWhileStatement: AST_WhileStatement = {
      kind: "WhileStatement",
      test,
      body,
      start: body.start,
      end: body.end,
    };

    body = bodyWhileStatement;

    if (initializer) {
      const bodyWithInitializer: AST_BlockStatement = {
        kind: "BlockStatement",
        body: [initializer, body],
        start: body.start,
        end: body.end,
      };

      body = bodyWithInitializer;
    }

    return body;
  }

  private parseBreakStatement(): AST_BreakStatement {
    const breakKeyword = this.advance();

    // BUILD breakStatement
    const breakStatement: AST_BreakStatement = {
      kind: "BreakStatement",
      start: breakKeyword.start,
      end: breakKeyword.end,
    };

    return breakStatement;
  }

  private parseContinueStatement(): AST_ContinueStatement {
    const continueKeyword = this.advance();

    // BUILD continueStatement
    const continueStatement: AST_ContinueStatement = {
      kind: "ContinueStatement",
      start: continueKeyword.start,
      end: continueKeyword.end,
    };

    return continueStatement;
  }

  private parseFuncExpression(): AST_Expression {
    if (this.at().type !== TokenType.FUNC) return this.parseAssignmentExp();

    const funcStart = this.advance().start; // advance past 'func' keyword

    // HANDLE NAME
    let name: AST_FunctionExpression["name"] = null;

    if (this.at().type === TokenType.IDENTIFIER) name = this.advance().value;

    // HANDLE PARAMETERS
    const { argumentList } = this.parseArgumentList();

    // make sure that each parameter is an identifier
    argumentList.forEach(arg => {
      if (arg.kind !== "Identifier")
        throw new Err(
          `Invalid function expression. Invalid parameter: '${arg.kind}' (only identifiers are valid) at position: ${arg.start}`,
          "parser"
        );
    });

    const parameters = argumentList as AST_Identifier[];

    // HANDLE BODY
    const blockStatement = this.parseBlockStatement();

    // BUILD FUNC
    const func: AST_FunctionExpression = {
      kind: "FunctionExpression",
      body: blockStatement,
      name,
      parameters,
      start: funcStart,
      end: blockStatement.end,
    };

    return func;
  }

  private parseAssignmentExp(): AST_Expression {
    const left = this.parseTernaryExp();
    const assignmentStart = left.start;

    if (this.at().type === TokenType.ASSIGNMENT_OPERATOR) {
      const operator = this.advance().value;

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
      this.advance(); // advance past ternary-operator

      const consequent = this.parseExpression();

      this.advanceAndExpect(TokenType.COLON, "Missing ':' following consequent in ternary expression");

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

    const objectStart = this.advance().start; // advance past OPEN_CURLY_BRACE
    const properties = new Array<AST_ObjectProperty>();

    // iterate as long as we're inside the object
    while (this.notEOF() && this.at().type !== TokenType.CLOSE_CURLY_BRACE) {
      const key = this.advanceAndExpect(TokenType.IDENTIFIER, "Missing key inside object-literal");

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
        this.advance(); // advance past comma
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

      this.advanceAndExpect(TokenType.COLON, "Missing ':' following identifier in object-literal"); // advance past COLON

      const value = this.parseExpression();

      // if it's not object-literal end, expect a comma for another property
      if (this.at().type !== TokenType.CLOSE_CURLY_BRACE)
        this.advanceAndExpect(
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

    const objectEnd = this.advanceAndExpect(
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
    const arrayStart = this.advance().start; // advance past OPEN_BRACKET

    while (this.notEOF() && this.at().type !== TokenType.CLOSE_BRACKET) {
      const element = this.parseExpression();

      if (this.at().type === TokenType.COMMA) this.advance(); // advance past comma

      elements.push(element);
    }

    const arrayEnd = this.advanceAndExpect(
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
      const operator = this.advance().value;
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
      const operator = this.advance().value;
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
      const operator = this.advance().value;
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
      const operator = this.advance().value;
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
      const operator = this.advance().value;
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
      const operator = this.advance().value;
      const right = this.parsePrefixUnaryExp();

      const binaryExp = this.generateASTBinaryExpNode(left, operator, right);
      left = binaryExp;
    }

    return left;
  }

  /**@desc parse `prefix` unary expressions (like: ++var)*/
  private parsePrefixUnaryExp(): AST_Expression {
    while (this.at().type === TokenType.UNARY_OPERATOR) {
      const operator = this.advance();
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
      const operator = this.advance();

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

  private parseCallExp(prevCallee?: AST_CallExp["callee"]): AST_Expression {
    const callee = prevCallee ?? this.parseMemberExp();

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
    if (this.at().type === TokenType.OPEN_PAREN) callExp = this.parseCallExp(callExp) as AST_CallExp;

    // handle immediately following member-expression
    if (this.isCurrentTokenAccessingProperty()) return this.parseMemberExp(callExp);

    return callExp;
  }

  private parseArgumentList() {
    this.advanceAndExpect(TokenType.OPEN_PAREN, "Invalid argument list. Missing opening parentheses ('(')");

    const argumentList: AST_Expression[] = [];

    // handle case when there are arguments
    if (this.at().type !== TokenType.CLOSE_PAREN) {
      const handleArgument = () => {
        const arg = this.parseExpression();
        argumentList.push(arg);
      };

      // handle first argument
      handleArgument();

      // handle next arguments
      while (this.at().type === TokenType.COMMA) {
        this.advance(); // advance past comma
        handleArgument();
      }
    }

    const argumentListEnd = this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid argument list. Missing closing parentheses (')')"
    ).end;

    return {
      argumentList,
      argumentListEnd,
    };
  }

  private parseMemberExp(expObject?: AST_ArrayLiteral | AST_ObjectLiteral | AST_CallExp): AST_Expression {
    let object: AST_Expression;

    if (expObject) object = expObject; // enable: '[1,2,3][0]', '{}.type' and so on
    else object = this.parsePrimaryExp();

    while (this.isCurrentTokenAccessingProperty() && this.isCurrentTokenFollowing(object)) {
      const operator = this.advance(); // '.' or '[' for computed expressions

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
        this.advanceAndExpect(
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

    // handle immediately following call-expression
    if (this.at().type === TokenType.OPEN_PAREN) return this.parseCallExp(object);

    return object;
  }

  /**@desc parses literal values and grouping expressions*/
  private parsePrimaryExp(): AST_Expression {
    const tokenType = this.at().type;

    switch (tokenType) {
      case TokenType.STRING: {
        const { value, start, end } = this.advance();
        const stringNode: AST_StringLiteral = { kind: "StringLiteral", value, start, end };
        return stringNode;
      }

      case TokenType.IDENTIFIER: {
        const { value, start, end } = this.advance();
        const identifierNode: AST_Identifier = { kind: "Identifier", value, start, end };
        return identifierNode;
      }

      case TokenType.NUMBER: {
        const { value, start, end } = this.advance();
        const numberNode: AST_NumericLiteral = { kind: "NumericLiteral", value: Number(value), start, end };
        return numberNode;
      }

      case TokenType.OPEN_PAREN: {
        this.advance(); // advance past open-paren

        const value = this.parseExpression();

        this.advanceAndExpect(
          TokenType.CLOSE_PAREN,
          "Unexpected token found inside parenthesised expression"
        );

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

  /**@desc determine whether currentToken is following preceding `Token/Node` (both are on the same line, and currentToken starts at least at preceding `Token/Node` end)*/
  private isCurrentTokenFollowing(preceding: Token | AST_Expression) {
    const precedingTokenEnd = preceding.end;
    const currentTokenStart = this.at().start;

    const areOnTheSameLine = precedingTokenEnd[0] === currentTokenStart[0];
    const doesCurrentStartAtLeastAtPrecedingEnd = currentTokenStart[1] >= precedingTokenEnd[1];

    return areOnTheSameLine && doesCurrentStartAtLeastAtPrecedingEnd;
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

  /**@desc determine whether current token is in bounds (`EOF` token hasn't been reached)*/
  private notEOF(): boolean {
    return this.at().type !== TokenType.EOF;
  }

  /**@desc determine whether `EOF` token is reached*/
  private isEOF(): boolean {
    return this.at().type === TokenType.EOF;
  }

  /**@return current `token`*/
  private at(): Token {
    return this.tokens[this.current];
  }

  /**@desc advance `current` and return previous (skipped over) token*/
  private advance(): Token {
    if (this.isEOF()) return this.at();

    return this.tokens[this.current++];
  }

  /**@desc extended `advance()` method with added token type-check and token presence-check*/
  private advanceAndExpect(type: TokenType, err: string): Token | never {
    const token = this.advance();

    if (!token || token.type !== type)
      throw new Err(
        err + `\nToken: '${token.value}', expected: '${type}', at position: ${token.start}`,
        "parser"
      );

    return token;
  }
}
