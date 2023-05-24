// PROJECT MODULES
import { Token, TokenType } from "./";
import { Err } from "../utils";
import {
  EQUALITY_OPERATORS,
  RELATIONAL_OPERATORS,
  ADDITIVE_OPERATORS,
  MULTIPLICATIVE_OPERATORS,
  ASSIGNMENT_OPERATORS,
  UNARY_OPERATORS,
} from "../constants";

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
      const newNode = this.parseStmt();

      this.programBody.push(newNode);
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

  // statements - LEAST IMPORTANT / INVOKED FIRST / EVALUATED LAST (typically)
  // assignmentExpr
  // ternaryExpr
  // logicalExpr (OR)
  // logicalExpr (AND)
  // equalityExpr
  // relationalExpr
  // additiveExpr
  // multiplicativeExpr
  // prefixUnaryExpr
  // postfixUnaryExpr
  // callExpr
  // memberExpr
  // objectExpr
  // arrayExp
  // primaryExpr - MOST IMPORTANT / INVOKED LAST / EVALUATED FIRST (typically)

  // -----------------------------------------------
  //                    PARSE
  // -----------------------------------------------

  private parseStmt(): AST_Node {
    let parsedStmt: AST_Stmt;

    switch (this.at().type) {
      // STATEMENTS
      case TokenType.VAR:
      case TokenType.CONST: {
        parsedStmt = this.parseVarDeclaration();
        break;
      }

      case TokenType.FUNC: {
        parsedStmt = this.parseFunctionDeclaration();
        break;
      }

      case TokenType.RETURN: {
        parsedStmt = this.parseReturnStmt();
        break;
      }

      case TokenType.IF: {
        parsedStmt = this.parseIfStmt();
        break;
      }

      case TokenType.WHILE: {
        parsedStmt = this.parseWhileStmt();
        break;
      }

      case TokenType.DO: {
        parsedStmt = this.parseDoWhileStmt();
        break;
      }

      case TokenType.BREAK: {
        parsedStmt = this.parseBreakStmt();
        break;
      }

      case TokenType.CONTINUE: {
        parsedStmt = this.parseContinueStmt();
        break;
      }

      case TokenType.FOR: {
        parsedStmt = this.parseForStmt();
        break;
      }

      case TokenType.THROW: {
        parsedStmt = this.parseThrowStmt();
        break;
      }

      case TokenType.TRY: {
        parsedStmt = this.parseTryCatchStmt();
        break;
      }

      case TokenType.SWITCH: {
        parsedStmt = this.parseSwitchStmt();
        break;
      }

      // EXPRESSIONS
      default:
        return this.parseExpr();
    }

    // HANDLE OPTIONAL SEMICOLON
    if (this.is(TokenType.SEMICOLON)) this.advance();

    return parsedStmt;
  }

  private parseExpr(): AST_Expr {
    const parsedExpr = this.parseFunctionExpr();

    // HANDLE OPTIONAL SEMICOLON
    if (this.is(TokenType.SEMICOLON)) this.advance();

    return parsedExpr;
  }

  private parseVarDeclaration(): AST_Stmt {
    const varDeclarationKeyword = this.advance();
    const varDeclarationStart = varDeclarationKeyword.start;
    const isConstant = varDeclarationKeyword.type === TokenType.CONST;

    const identifier = this.advanceAndExpect(
      TokenType.IDENTIFIER,
      `Invalid variable declaration. Missing identifier following: '${varDeclarationKeyword.value}'`
    ).value;

    // HANDLE UNINITIALIZED VARIABLE DECLARATION (like: 'var x')
    if (this.is(TokenType.SEMICOLON)) {
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

    const operator = this.advance();

    if (!this.isAssignmentOperator(operator))
      throw new Err(
        `Invalid variable declaration. Identifier is not followed by assignment operator`,
        "parser"
      );

    const varDeclarationValue = this.parseExpr();

    const varDeclaration: AST_VarDeclaration = {
      kind: "VarDeclaration",
      identifier,
      operator: operator.value,
      constant: isConstant,
      value: varDeclarationValue,
      start: varDeclarationStart,
      end: varDeclarationValue.end,
    };

    return varDeclaration;
  }

  private parseBlockStmt(): AST_BlockStmt {
    const start = this.advanceAndExpect(
      TokenType.OPEN_CURLY_BRACE,
      "Invalid block statement. Missing openining curly-brace ('{')"
    ).start;

    const body: AST_Stmt[] = [];

    // BUILD body
    while (this.notEOF() && !this.is(TokenType.CLOSE_CURLY_BRACE)) body.push(this.parseStmt());

    const end = this.advanceAndExpect(
      TokenType.CLOSE_CURLY_BRACE,
      "Invalid block statement. Missing closing curly-brace ('}')"
    ).end;

    const blockStmt: AST_BlockStmt = {
      kind: "BlockStmt",
      body,
      start,
      end,
    };

    // HANDLE OPTIONAL SEMICOLON
    if (this.is(TokenType.SEMICOLON)) this.advance();

    return blockStmt;
  }

  private parseFunctionDeclaration(): AST_FunctionDeclaration {
    const funcStart = this.advance().start; // advance past 'func' keyword

    const name = this.advanceAndExpect(
      TokenType.IDENTIFIER,
      "Invalid function declaration. Missing function name following 'func' keyword"
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
    const blockStmt = this.parseBlockStmt();

    // BUILD FUNC
    const func: AST_FunctionDeclaration = {
      kind: "FunctionDeclaration",
      body: blockStmt,
      name,
      parameters,
      start: funcStart,
      end: blockStmt.end,
    };

    return func;
  }

  private parseReturnStmt(): AST_ReturnStmt {
    const returnKeyword = this.advance();

    let argument;

    // handle case when there's a return value
    if (this.isCurrentTokenFollowing(returnKeyword)) argument = this.parseExpr();

    // BUILD returnStmt
    const returnStmt: AST_ReturnStmt = {
      kind: "ReturnStmt",
      argument,
      start: returnKeyword.start,
      end: argument?.end ?? returnKeyword.end,
    };

    return returnStmt;
  }

  private parseIfStmt(): AST_IfStmt {
    const start = this.advance().start; // advance past 'if' keyword

    // HANDLE TEST
    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid if statement. Missing opening parentheses ('(') following 'if' keyword"
    );

    const test = this.parseExpr();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid if statement. Missing closing parentheses (')') following test"
    );

    // HANDLE CONSEQUENT
    let consequent;

    if (this.is(TokenType.OPEN_CURLY_BRACE)) consequent = this.parseBlockStmt();
    else consequent = this.parseStmt(); // enable one-liners

    // HANDLE ALTERNATE
    let alternate;

    if (this.is(TokenType.ELSE)) {
      this.advance(); // advance past 'else' keyword

      if (this.is(TokenType.OPEN_CURLY_BRACE)) alternate = this.parseBlockStmt();
      else alternate = this.parseStmt(); // enable one-liners
    }

    // BUILD IfStmt
    const ifStmt: AST_IfStmt = {
      kind: "IfStmt",
      test,
      consequent,
      alternate,
      start,
      end: alternate?.end ?? consequent.end,
    };

    return ifStmt;
  }

  private parseWhileStmt(): AST_WhileStmt {
    const start = this.advance().start; // advance past 'while' keyword

    const test = this.parseWhileStmtTest();
    const body = this.parseWhileStmtBody();

    // BUILD WhileStmt
    const whileStmt: AST_WhileStmt = {
      kind: "WhileStmt",
      test,
      body,
      start,
      end: body.end,
    };

    return whileStmt;
  }

  /**@desc parses `while` and `doWhile` statements body*/
  private parseWhileStmtBody(): AST_Node {
    let body;

    if (this.is(TokenType.OPEN_CURLY_BRACE)) body = this.parseBlockStmt();
    else body = this.parseStmt(); // enable one-liners

    return body;
  }

  /**@desc parses `while` and `doWhile` statements test*/
  private parseWhileStmtTest(): AST_Node {
    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid while statement. Missing opening parentheses ('(') following 'while' keyword"
    );

    const test = this.parseExpr();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid while statement. Missing closing parentheses (')') following test"
    );

    return test;
  }

  private parseDoWhileStmt(): AST_DoWhileStmt {
    const start = this.advance().start; // advance past 'do' keyword

    const body = this.parseWhileStmtBody();

    this.advanceAndExpect(
      TokenType.WHILE,
      "Invalid do-while statement. Missing 'while' keyword following body"
    );

    const test = this.parseWhileStmtTest();

    // BUILD DoWhileStmt
    const doWhileStmt: AST_DoWhileStmt = {
      kind: "DoWhileStmt",
      test,
      body,
      start,
      end: test.end,
    };

    return doWhileStmt;
  }

  private parseForStmt(): AST_Stmt {
    const forKeyword = this.advance();

    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid for statement. Missing opening parentheses ('(') following 'for' keyword"
    );

    // HANDLE INITIALIZER
    let initializer;

    // allow initializer omission
    if (this.is(TokenType.SEMICOLON)) {
      initializer = undefined;
    }

    // initializer as variable declaration
    else if (this.is(TokenType.CONST, TokenType.VAR)) {
      initializer = this.parseVarDeclaration();
    }

    // initializer as expression
    else initializer = this.parseExpr();

    // handle mandatory ';' delimiter
    if (this.previous().type !== TokenType.SEMICOLON)
      throw new Err(
        `Invalid for statement. Missing semicolon (';') delimiter following initializer, at position ${
          this.previous().start
        }`,
        "parser"
      );

    // HANDLE TEST
    let test;

    // allow test omission
    if (!this.is(TokenType.SEMICOLON)) test = this.parseExpr();

    // handle mandatory ';' delimiter
    if (this.previous().type !== TokenType.SEMICOLON)
      throw new Err(
        `Invalid for statement. Missing semicolon (';') delimiter following test, at position ${
          this.previous().start
        }`,
        "parser"
      );

    // HANDLE UPDATE
    let update;

    // allow update omission
    if (!this.is(TokenType.CLOSE_PAREN)) update = this.parseExpr();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid for statement. Missing closing parentheses (')') following update"
    );

    // HANDLE BODY
    let body;

    if (this.is(TokenType.OPEN_CURLY_BRACE)) body = this.parseBlockStmt();
    else body = this.parseStmt(); // enable one-liners

    // DESUGARING
    // forStatement doesn't introduce any "new" capabilities to the language, it can be fully implemented with already defined NODES
    // therefore, I treat it as syntactic-sugar. Here I'm desugaring forStatement (breaking it up) into its primary components / NODES

    if (update) {
      const bodyWithUpdate: AST_BlockStmt = {
        kind: "BlockStmt",
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

    const bodyWhileStmt: AST_WhileStmt = {
      kind: "WhileStmt",
      test,
      body,
      start: body.start,
      end: body.end,
    };

    body = bodyWhileStmt;

    if (initializer) {
      const bodyWithInitializer: AST_BlockStmt = {
        kind: "BlockStmt",
        body: [initializer, body],
        start: body.start,
        end: body.end,
      };

      body = bodyWithInitializer;
    }

    return body;
  }

  private parseBreakStmt(): AST_BreakStmt {
    const breakKeyword = this.advance();

    // BUILD breakStmt
    const breakStmt: AST_BreakStmt = {
      kind: "BreakStmt",
      start: breakKeyword.start,
      end: breakKeyword.end,
    };

    return breakStmt;
  }

  private parseContinueStmt(): AST_ContinueStmt {
    const continueKeyword = this.advance();

    // BUILD continueStmt
    const continueStmt: AST_ContinueStmt = {
      kind: "ContinueStmt",
      start: continueKeyword.start,
      end: continueKeyword.end,
    };

    return continueStmt;
  }

  private parseThrowStmt(): AST_ThrowStmt {
    const start = this.advance().start; // advance past 'throw' keyword

    const error = this.parseExpr();

    // BUILD throwStmt
    const throwStmt: AST_ThrowStmt = {
      kind: "ThrowStmt",
      error,
      start,
      end: error.end,
    };

    return throwStmt;
  }

  private parseTryCatchStmt(): AST_TryCatchStmt {
    const start = this.advance().start; // advance past 'try' keyword

    const tryBlock = this.parseBlockStmt();

    this.advanceAndExpect(
      TokenType.CATCH,
      "Invalid try-catch statement. Missing 'catch' keyword following try clause"
    );

    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid try-catch statement. Missing opening parentheses ('(') following 'catch' keyword"
    );

    const catchParam = this.parseExpr();
    if (catchParam.kind !== "Identifier")
      throw new Err(
        `Invalid try-catch statement. Invalid parameter: '${catchParam.kind}' passed to catch parameter list, at position: ${catchParam.start}`,
        "parser"
      );

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid try-catch statement. Missing closing parentheses (')') following catch parameter list"
    );

    const catchBlock = this.parseBlockStmt();

    // BUILD tryCatchStmt
    const tryCatchStmt: AST_TryCatchStmt = {
      kind: "TryCatchStmt",
      tryBlock,
      catchParam: catchParam as AST_Identifier,
      catchBlock,
      start,
      end: catchBlock.end,
    };

    return tryCatchStmt;
  }

  private parseSwitchStmt(): AST_SwitchStmt {
    const start = this.advance().start; // advance past 'switch' keyword

    // HANDLE discriminant

    this.advanceAndExpect(
      TokenType.OPEN_PAREN,
      "Invalid switch statement. Missing opening parentheses ('(') following 'switch' keyword"
    );

    const discriminant = this.parseExpr();

    this.advanceAndExpect(
      TokenType.CLOSE_PAREN,
      "Invalid switch statement. Missing closing parentheses (')') following discriminant"
    );

    // HANDLE cases

    this.advanceAndExpect(
      TokenType.OPEN_CURLY_BRACE,
      "Invalid switch statement. Missing opening curly-brace ('{') denoting switch statement's body"
    );

    const cases: AST_SwitchStmt["cases"] = [];

    // BUILD cases
    while (this.notEOF() && !this.is(TokenType.CLOSE_CURLY_BRACE)) {
      // handle invalid tokens
      if (!this.is(TokenType.CASE, TokenType.DEFAULT)) {
        throw new Err(
          `Invalid switch statement. Invalid token: '${
            this.at().value
          }', expected: 'case-statement', at position: ${this.at().start}`,
          "parser"
        );
      }

      const caseStmt = this.parseSwitchCaseStmt();
      cases.push(caseStmt);
    }

    const end = this.advanceAndExpect(
      TokenType.CLOSE_CURLY_BRACE,
      "Invalid switch statement. Missing closing curly-brace ('}') following switch statement's body"
    ).end;

    // BUILD switchStmt
    const switchStmt: AST_SwitchStmt = {
      kind: "SwitchStmt",
      discriminant,
      cases,
      start,
      end,
    };

    return switchStmt;
  }

  private parseSwitchCaseStmt(): AST_SwitchCaseStmt {
    const caseKeyword = this.advance();
    const isDefaultCase = caseKeyword.type === TokenType.DEFAULT;

    // HANDLE test
    let test;
    if (!isDefaultCase) test = this.parseExpr();

    this.advanceAndExpect(
      TokenType.COLON,
      `Invalid switch-case statement. Missing colon (':') following ${
        isDefaultCase ? `'${caseKeyword.value}' keyword` : "test"
      }`
    );

    // HANDLE consequent
    let consequent;
    if (this.is(TokenType.OPEN_CURLY_BRACE)) consequent = this.parseBlockStmt();
    else consequent = this.parseStmt(); // enable one-liners

    // BUILD switchCaseStmt
    const switchCaseStmt: AST_SwitchCaseStmt = {
      kind: "SwitchCaseStmt",
      test,
      consequent,
      start: caseKeyword.start,
      end: consequent.end,
    };

    return switchCaseStmt;
  }

  private parseFunctionExpr(): AST_Expr {
    if (this.at().type !== TokenType.FUNC) return this.parseAssignmentExpr();

    const funcStart = this.advance().start; // advance past 'func' keyword

    // HANDLE NAME
    let name: AST_FunctionExpr["name"] = null;

    if (this.is(TokenType.IDENTIFIER)) name = this.advance().value;

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
    const blockStmt = this.parseBlockStmt();

    // BUILD FUNC
    const func: AST_FunctionExpr = {
      kind: "FunctionExpr",
      body: blockStmt,
      name,
      parameters,
      start: funcStart,
      end: blockStmt.end,
    };

    return func;
  }

  private parseAssignmentExpr(): AST_Expr {
    const left = this.parseTernaryExpr();
    const assignmentStart = left.start;

    if (this.isAssignmentOperator(this.at())) {
      const operator = this.advance().value;

      const value = this.parseTernaryExpr();

      const assignmentExpr: AST_AssignmentExpr = {
        kind: "AssignmentExpr",
        assigne: left,
        operator,
        value,
        start: assignmentStart,
        end: value.end,
      };

      return assignmentExpr;
    }

    return left;
  }

  private parseTernaryExpr(): AST_Expr {
    let test = this.parseLogicalExprOR();

    while (this.is(TokenType.QUESTION)) {
      this.advance(); // advance past ternary-operator

      const consequent = this.parseExpr();

      this.advanceAndExpect(
        TokenType.COLON,
        "Missing colon (':') following consequent in ternary expression"
      );

      const alternate = this.parseExpr();

      const ternaryExp: AST_TernaryExpr = {
        kind: "TernaryExpr",
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

  private parseLogicalExprOR(): AST_Expr {
    let left = this.parseLogicalExprAND();

    while (this.is(TokenType.OR)) {
      const operator = this.advance().value;
      const right = this.parseLogicalExprAND();

      const logicalExpr: AST_LogicalExpr = {
        kind: "LogicalExpr",
        left,
        operator,
        right,
        start: left.start,
        end: right.end,
      };

      left = logicalExpr;
    }

    return left;
  }

  private parseLogicalExprAND(): AST_Expr {
    let left = this.parseEqualityExpr();

    while (this.is(TokenType.AND)) {
      const operator = this.advance().value;
      const right = this.parseEqualityExpr();

      const logicalExpr: AST_LogicalExpr = {
        kind: "LogicalExpr",
        left,
        operator,
        right,
        start: left.start,
        end: right.end,
      };

      left = logicalExpr;
    }

    return left;
  }

  private parseEqualityExpr(): AST_Expr {
    let left = this.parseRelationalExpr();

    while (this.isEqualityOperator(this.at())) {
      const operator = this.advance().value;
      const right = this.parseRelationalExpr();

      const binaryExpr = this.generateASTBinaryExprNode(left, operator, right);
      left = binaryExpr;
    }

    return left;
  }

  private parseRelationalExpr(): AST_Expr {
    let left = this.parseAdditiveExpr();

    while (this.isRelationalOperator(this.at())) {
      const operator = this.advance().value;
      const right = this.parseAdditiveExpr();

      const binaryExpr = this.generateASTBinaryExprNode(left, operator, right);
      left = binaryExpr;
    }

    return left;
  }

  private parseAdditiveExpr(): AST_Expr {
    let left = this.parseMultiplicativeExpr();

    // here's the problem
    while (this.isAdditiveOperator(this.at())) {
      const operator = this.advance().value;
      const right = this.parseMultiplicativeExpr();

      const binaryExpr = this.generateASTBinaryExprNode(left, operator, right);
      left = binaryExpr;
    }

    return left;
  }

  private parseMultiplicativeExpr(): AST_Expr {
    let left = this.parsePrefixUnaryExpr();

    while (this.isMultiplicativeOperator(this.at())) {
      const operator = this.advance().value;
      const right = this.parsePrefixUnaryExpr();

      const binaryExpr = this.generateASTBinaryExprNode(left, operator, right);
      left = binaryExpr;
    }

    return left;
  }

  private parsePrefixUnaryExpr(): AST_Expr {
    if (this.isUnaryOperator(this.at())) {
      const operator = this.advance();
      const operand =
        operator.type === TokenType.TYPEOF ? this.parsePrefixUnaryExpr() : this.parsePostfixUnaryExpr();

      const unaryExpr: AST_PrefixUnaryExpr = {
        kind: "PrefixUnaryExpr",
        operand,
        operator: operator.value,
        start: operator.start,
        end: operand.end,
      };

      return unaryExpr;
    }

    return this.parsePostfixUnaryExpr();
  }

  /**@desc parse `postfix` unary-expressions (like: var++)*/
  private parsePostfixUnaryExpr(): AST_Expr {
    const left = this.parseCallExpr();

    if (this.isUnaryOperator(this.at())) {
      const operator = this.advance().value;

      const unaryExpr: AST_PostfixUnaryExpr = {
        kind: "PostfixUnaryExpr",
        operator,
        operand: left,
        start: left.start,
        end: left.end,
      };

      return unaryExpr;
    }

    return left;
  }

  private parseCallExpr(prevCallee?: AST_CallExpr["callee"]): AST_Expr {
    const callee = prevCallee ?? this.parseMemberExpr();

    if (!this.is(TokenType.OPEN_PAREN)) return callee;

    // HANDLE ARGUMENTS
    const { argumentList, argumentListEnd } = this.parseArgumentList();

    // BUILD CALL-EXP
    let callExpr: AST_CallExpr = {
      kind: "CallExpr",
      callee,
      arguments: argumentList,
      start: callee.start,
      end: argumentListEnd,
    };

    // handle another call-expression immediately following current callExpr (example: 'func()()')
    if (this.is(TokenType.OPEN_PAREN)) callExpr = this.parseCallExpr(callExpr) as AST_CallExpr;

    // handle immediately following member-expression
    if (this.isCurrentTokenAccessingProperty()) return this.parseMemberExpr(callExpr);

    return callExpr;
  }

  private parseArgumentList() {
    this.advanceAndExpect(TokenType.OPEN_PAREN, "Invalid argument list. Missing opening parentheses ('(')");

    const argumentList: AST_Expr[] = [];

    // handle case when there are arguments
    if (!this.is(TokenType.CLOSE_PAREN)) {
      const handleArgument = () => {
        const arg = this.parseExpr();
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

  private parseMemberExpr(callExpr?: AST_CallExpr): AST_Expr {
    let object: AST_Expr;

    if (callExpr) object = callExpr; // enable member-expressions immediately following call-expression
    else object = this.parseObjectExpr();

    while (this.isCurrentTokenAccessingProperty() && this.isCurrentTokenFollowing(object)) {
      const operator = this.advance(); // '.' or '['

      let property: AST_Expr;
      let computed = false;

      // NON-COMPUTED (obj.property)
      if (operator.type === TokenType.DOT) {
        property = this.parseObjectExpr();

        if (property.kind !== "Identifier")
          throw new Err(
            `Invalid member-expression. Property kind: '${property.kind}' is not an identifier (only identifiers can follow '.' operator), at position ${property.start}`,
            "parser"
          );
      }

      // COMPUTED (obj["key"])
      else if (operator.type === TokenType.OPEN_BRACKET) {
        computed = true;
        property = this.parseExpr(); // not checking property kind as there are many expression that could evaluate to valid identifier
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

      const memberExpr: AST_MemberExpr = {
        kind: "MemberExpr",
        object,
        property,
        computed,
        start: object.start,
        end: property.end,
      };

      object = memberExpr;
    }

    return object;
  }

  private parseObjectExpr(): AST_Expr {
    if (!this.is(TokenType.OPEN_CURLY_BRACE)) return this.parseArrayExpr();

    const objectStart = this.advance().start; // advance past OPEN_CURLY_BRACE
    const properties = new Array<AST_ObjectProperty>();

    // iterate as long as we're inside the object
    while (this.notEOF() && !this.is(TokenType.CLOSE_CURLY_BRACE)) {
      const key = this.advanceAndExpect(TokenType.IDENTIFIER, "Missing key inside object-literal");

      // HANDLE SHORTHANDS

      // shorthand: { key, }
      if (this.is(TokenType.COMMA)) {
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
      else if (this.is(TokenType.CLOSE_CURLY_BRACE)) {
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

      this.advanceAndExpect(TokenType.COLON, "Missing colon (':') following identifier in object-literal"); // advance past COLON

      const value = this.parseExpr();

      // if it's not object-literal end, expect a comma for another property
      if (!this.is(TokenType.CLOSE_CURLY_BRACE))
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

    return objectLiteral;
  }

  private parseArrayExpr(): AST_Expr {
    if (!this.is(TokenType.OPEN_BRACKET)) return this.parsePrimaryExpr();

    const elements = new Array<AST_Expr>();
    const arrayStart = this.advance().start; // advance past OPEN_BRACKET

    while (this.notEOF() && !this.is(TokenType.CLOSE_BRACKET)) {
      const element = this.parseExpr();

      if (this.is(TokenType.COMMA)) this.advance(); // advance past comma

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

    return arrayLiteral;
  }

  private parsePrimaryExpr(): AST_Expr {
    const tokenType = this.at().type;

    switch (tokenType) {
      case TokenType.STRING: {
        const { value: value, start, end } = this.advance();
        const stringNode: AST_StringLiteral = { kind: "StringLiteral", value, start, end };
        return stringNode;
      }

      case TokenType.IDENTIFIER: {
        const { value: value, start, end } = this.advance();
        const identifierNode: AST_Identifier = { kind: "Identifier", value, start, end };
        return identifierNode;
      }

      case TokenType.NUMBER: {
        const { value: value, start, end } = this.advance();
        const numberNode: AST_NumericLiteral = {
          kind: "NumericLiteral",
          value: Number(value),
          start,
          end,
        };
        return numberNode;
      }

      case TokenType.OPEN_PAREN: {
        this.advance(); // advance past open-paren

        const value = this.parseExpr();

        this.advanceAndExpect(
          TokenType.CLOSE_PAREN,
          "Invalid parenthesised expression. Missing closing parentheses"
        );

        return value;
      }

      // UNIDENTIFIED TOKENS AND INVALID CODE
      default:
        throw new Err(
          `Unexpected token found during parsing, token: '${this.at().value}' at position: ${
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
  private isCurrentTokenFollowing(preceding: Token | AST_Expr) {
    const precedingTokenEnd = preceding.end;
    const currentTokenStart = this.at().start;

    const areOnTheSameLine = precedingTokenEnd[0] === currentTokenStart[0];
    const doesCurrentStartAtLeastAtPrecedingEnd = currentTokenStart[1] >= precedingTokenEnd[1];

    return areOnTheSameLine && doesCurrentStartAtLeastAtPrecedingEnd;
  }

  /**@desc helper function for parsing binary-expressions. It generates and returns `AST Binary Expression` node*/
  private generateASTBinaryExprNode(left: AST_Expr, operator: string, right: AST_Expr): AST_BinaryExpr {
    const astBinaryExpr: AST_BinaryExpr = {
      kind: "BinaryExpr",
      left,
      operator,
      right,
      start: left.start,
      end: right.end,
    };

    return astBinaryExpr;
  }

  /**@desc determine whether current token is in bounds (`EOF` token hasn't been reached)*/
  private notEOF(): boolean {
    return this.at().type !== TokenType.EOF;
  }

  /**@desc determine whether `EOF` token is reached*/
  private isEOF(): boolean {
    return this.at().type === TokenType.EOF;
  }

  /**@desc determine whether current token is one of `types`*/
  private is(...types: TokenType[]): boolean {
    if (this.isEOF()) return false;

    return types.some(type => this.at().type === type);
  }

  /**@return current `token`*/
  private at(): Token {
    return this.tokens[this.current];
  }

  /**@return the most recently advanced (skipped over) `token`*/
  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  /**@desc advance `current` and return previous (skipped over) token*/
  private advance(): Token {
    if (this.isEOF()) return this.at();

    return this.tokens[this.current++];
  }

  /**@desc extended `advance()` method with added token type-check and token presence-check*/
  private advanceAndExpect(type: TokenType, err: string): Token | never {
    const token = this.advance();

    if (token.type !== type)
      throw new Err(
        err + `\nToken: '${token.value}', expected: '${type}', at position: ${token.start}`,
        "parser"
      );

    return token;
  }

  // OPERATOR CHECKS

  private isAssignmentOperator({ type }: Token): boolean {
    return ASSIGNMENT_OPERATORS.some(validOperator => validOperator === type);
  }

  private isEqualityOperator({ type }: Token): boolean {
    return EQUALITY_OPERATORS.some(validOperator => validOperator === type);
  }

  private isRelationalOperator({ type }: Token): boolean {
    return RELATIONAL_OPERATORS.some(validOperator => validOperator === type);
  }

  private isAdditiveOperator({ type }: Token): boolean {
    return ADDITIVE_OPERATORS.some(validOperator => validOperator === type);
  }

  private isMultiplicativeOperator({ type }: Token): boolean {
    return MULTIPLICATIVE_OPERATORS.some(validOperator => validOperator === type);
  }

  private isUnaryOperator({ type }: Token): boolean {
    return UNARY_OPERATORS.some(validOperator => validOperator === type);
  }
}
