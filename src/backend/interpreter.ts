// PROJECT MODULES
import { Err, getBooleanValue } from "../utils";
import { VariableEnv } from "./variableEnv";
import { VALID_MEMBER_EXPR_RUNTIME_TYPES } from "../constants";
import { traversePrototypeChain } from "./prototypeChain";
import { STATIC_FUNCTION } from "./staticFunctions";
import { MK, Runtime } from "./";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

interface EvaluatedMemberExprData {
  object: Runtime.ProtoValue;
  property: string | number;
  value: Runtime.Value;
}

interface SharedUnaryExprOperatorsData {
  valueBeforeUpdate: Runtime.Number;
  valueAfterUpdate: Runtime.Number;
}

// -----------------------------------------------
//  STATEMENTS TO PROPAGATE THROUGH CALL-STACK
// -----------------------------------------------
// Constructors used for propagating statements through call-stack with exceptions

/**@decs Constructor used for propagating `returnStatement`*/
class Return {
  constructor(public readonly value: Runtime.Value) {}
}

/**@decs Constructor used for propagating `breakStatement`*/
class Break {}

/**@decs Constructor used for propagating `continueStatement`*/
class Continue {}

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
  /**@desc evaluate/interpret `astNode`*/
  public evaluate(astNode: AST_Node, env: VariableEnv): Runtime.Value {
    switch (astNode.kind) {
      case "Program":
        return this.evalProgram(astNode as AST_Program, env);

      case "NumericLiteral":
        return MK.NUMBER((astNode as AST_NumericLiteral).value);

      case "StringLiteral":
        return MK.STRING((astNode as AST_StringLiteral).value);

      case "ObjectLiteral":
        return this.evalObjectExpr(astNode as AST_ObjectLiteral, env);

      case "ArrayLiteral":
        return this.evalArrayExpr(astNode as AST_ArrayLiteral, env);

      case "Identifier":
        return this.evalIdentifier(astNode as AST_Identifier, env);

      case "MemberExpr":
        return this.evalMemberExpr(astNode as AST_MemberExpr, env).value;

      case "CallExpr":
        return this.evalCallExpr(astNode as AST_CallExpr, env);

      case "VarDeclaration":
        return this.evalVarDeclaration(astNode as AST_VarDeclaration, env);

      case "FunctionDeclaration":
        return this.evalFuncDeclaration(astNode as AST_FunctionDeclaration, env);

      case "FunctionExpr":
        return this.evalFunctionExpr(astNode as AST_FunctionExpr, env);

      case "AssignmentExpr":
        return this.evalAssignmentExpr(astNode as AST_AssignmentExpr, env);

      case "BinaryExpr":
        return this.evalBinaryExpr(astNode as AST_BinaryExpr, env);

      case "PrefixUnaryExpr":
        return this.evalPrefixUnaryExpr(astNode as AST_PrefixUnaryExpr, env);

      case "PostfixUnaryExpr":
        return this.evalPostfixUnaryExpr(astNode as AST_PostfixUnaryExpr, env);

      case "TernaryExpr":
        return this.evalTernaryExpr(astNode as AST_TernaryExpr, env);

      case "IfStmt":
        return this.evalIfStatement(astNode as AST_IfStmt, env);

      case "WhileStmt":
        return this.evalWhileStatement(astNode as AST_WhileStmt, env);

      case "BlockStmt":
        return this.evalBlockStatement(astNode as AST_BlockStmt, env);

      case "ReturnStmt":
        return this.evalReturnStatement(astNode as AST_ReturnStmt, env);

      case "BreakStmt":
        return this.evalBreakStatement();

      case "ContinueStmt":
        return this.evalContinueStatement();

      default:
        throw new Err(
          `This AST node kind has not yet been setup for interpretation.\nNode kind: '${astNode.kind}' at position: ${astNode.start}`,
          "internal"
        );
    }
  }

  // -----------------------------------------------
  //                 EVAL METHODS
  // -----------------------------------------------

  private evalProgram(program: AST_Program, env: VariableEnv): Runtime.Value {
    let lastEvaluated: Runtime.Value = MK.NULL();

    for (const statement of program.body) lastEvaluated = this.evaluate(statement, env);

    return lastEvaluated;
  }

  private evalIdentifier(identifier: AST_Identifier, env: VariableEnv): Runtime.Value {
    return env.lookupVar(identifier.value, identifier.start);
  }

  private evalVarDeclaration(varDeclaration: AST_VarDeclaration, env: VariableEnv): Runtime.Value {
    const runtimeValue = varDeclaration.value ? this.evaluate(varDeclaration.value, env) : MK.UNDEFINED(); // set value for uninitialized variables to undefined

    // allow for uninitialized variable declarations, and '=' assignment operator
    if (varDeclaration.operator !== undefined && varDeclaration.operator !== "=")
      throw new Err(
        `Invalid variable declaration. Invalid assignment operator: '${varDeclaration.operator}', at position ${varDeclaration.start}`,
        "interpreter"
      );

    env.declareVar(varDeclaration.identifier, runtimeValue, {
      constant: varDeclaration.constant,
      position: varDeclaration.start,
    });

    // treat variable declaration as a statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalFuncDeclaration(funcDeclaration: AST_FunctionDeclaration, env: VariableEnv): Runtime.Undefined {
    const { name, parameters, body, start } = funcDeclaration;

    const func = MK.FUNCTION(name, parameters, body, env);

    env.declareVar(name, func, { position: start, constant: true });

    // treat function declaration as a statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalFunctionExpr(funcExpression: AST_FunctionExpr, env: VariableEnv): Runtime.Function {
    const { name, parameters, body } = funcExpression;

    return MK.FUNCTION(name ?? "(anonymous)", parameters, body, env);
  }

  private evalReturnStatement(returnStatement: AST_ReturnStmt, env: VariableEnv): never {
    let returnValue: Runtime.Value;

    if (returnStatement.argument) returnValue = this.evaluate(returnStatement.argument, env);
    else returnValue = MK.UNDEFINED();

    throw new Return(returnValue);
  }

  private evalBreakStatement(): never {
    throw new Break();
  }

  private evalContinueStatement(): never {
    throw new Continue();
  }

  private evalAssignmentExpr(assignmentExpr: AST_AssignmentExpr, env: VariableEnv): Runtime.Value {
    // VARIABLE DECLARATIONS
    const assignmentStart = assignmentExpr.start;
    const operator = assignmentExpr.operator;
    const assigne = assignmentExpr.assigne;

    /**@desc stores runtime `assigne-value`
    Example: identifierAssigne `'x'` with value: `'5'`; assigneValue equals: `runtime-number` with value: `'5'`*/
    let assigneValue: Runtime.Value;
    let computedAssignmentValue: Runtime.Value;
    let memberExprObj: Runtime.Object | Runtime.Array;
    let memberExprProperty: string | number;

    const assignmentValue = this.evaluate(assignmentExpr.value, env);

    // HANDLE ASSIGNE

    // identifier
    if (assigne.kind === "Identifier") {
      assigneValue = this.evalIdentifier(assigne as AST_Identifier, env);
    }

    // array/object
    else if (assigne.kind === "MemberExpr") {
      const { value, property, object } = this.evalMemberExpr(assigne as AST_MemberExpr, env);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid assignment expression. Property assignment on type: '${object.type}' is forbidden, at position: ${assignmentStart}`,
          "interpreter"
        );

      memberExprObj = object as Runtime.Object | Runtime.Array;
      memberExprProperty = property;
      assigneValue = value;
    }

    // invalid kind
    else
      throw new Err(
        `Invalid assignment expression. Invalid Assigne kind: '${assigne.kind}', at position: ${assignmentStart}`,
        "interpreter"
      );

    // COMPUTE RUNTIME-VALUE BASED ON OPERATOR
    switch (operator) {
      case "=": {
        computedAssignmentValue = assignmentValue;
        break;
      }

      case "+=": {
        // @desc valid data types:
        // number/number | string/string | string/number combinations

        const extractedBinaryOperator = operator[0]; // '+'

        // number/number
        if (assigneValue.type === "number" && assignmentValue.type === "number") {
          computedAssignmentValue = this.evalNumericBinaryExpr(
            assigneValue as Runtime.Number,
            extractedBinaryOperator,
            assignmentValue as Runtime.Number,
            assignmentStart
          );

          break;
        }

        // string/string and string/number combinations
        else if (this.isValidStringNumberCombination(assigneValue.type, assignmentValue.type)) {
          computedAssignmentValue = this.evalStringBinaryExpr(
            assigneValue as Runtime.String,
            extractedBinaryOperator,
            assignmentValue as Runtime.Number,
            assignmentStart
          );

          break;
        }

        // invalid data types
        else {
          throw new Err(
            `Invalid assignment expression. Operator: '${operator}' incorrectly used with assigne of type: '${assigneValue.type}', at position: ${assignmentStart}`,
            "interpreter"
          );
        }
      }

      case "-=":
      case "*=":
      case "/=":
      case "%=": {
        // @desc valid data types: number/number

        // number/number
        if (assigneValue.type === "number" && assignmentValue.type === "number") {
          const extractedBinaryOperator = operator[0];

          computedAssignmentValue = this.evalNumericBinaryExpr(
            assigneValue as Runtime.Number,
            extractedBinaryOperator,
            assignmentValue as Runtime.Number,
            assignmentStart
          );

          break;
        }

        // invalid data types
        else {
          throw new Err(
            `Invalid assignment expression. Operator: '${operator}' incorrectly used with assigne of type: '${assigneValue.type}', at position: ${assignmentStart}`,
            "interpreter"
          );
        }
      }

      case "||=":
      case "&&=": {
        // @desc valid data types: any/any
        const extractedLogicalOperator = operator.slice(0, 2);

        computedAssignmentValue = this.evalBinaryExprSharedOperators(
          assigneValue,
          extractedLogicalOperator,
          assignmentValue,
          assignmentStart
        );

        break;
      }

      default:
        throw new Err(
          `Invalid variable assignment. Invalid assignment operator: '${operator}', at position ${assignmentStart}`,
          "interpreter"
        );
    }

    // VALUE ASSIGNMENT
    this.handleValueAssignment(
      env,
      assignmentStart,
      assigne,
      computedAssignmentValue,
      memberExprObj!,
      memberExprProperty!
    );

    return computedAssignmentValue; // assignment is treated as expression, hence return the value
  }

  private evalObjectExpr({ properties }: AST_ObjectLiteral, env: VariableEnv): Runtime.Value {
    const object: Runtime.Object = MK.OBJECT();

    properties.forEach(({ key, value, start }) => {
      const runtimeValue = value === undefined ? env.lookupVar(key, start) : this.evaluate(value, env);

      object.value[key] = runtimeValue;
    });

    return object;
  }

  private evalArrayExpr(expr: AST_ArrayLiteral, env: VariableEnv): Runtime.Value {
    const array: Runtime.Array = MK.ARRAY();

    expr.elements.forEach(value => {
      const runtimeValue = this.evaluate(value, env);

      array.value.push(runtimeValue);
    });

    return array;
  }

  private evalMemberExpr(expr: AST_MemberExpr, env: VariableEnv): EvaluatedMemberExprData {
    // make sure that 'expr.object' is a valid member-expression object
    const runtimeExprObject = this.evaluate(expr.object, env);

    if (!this.isValidMemberExpressionObject(runtimeExprObject.type))
      throw new Err(
        `Invalid member expression. Invalid object: '${runtimeExprObject.value}' ('${runtimeExprObject.value}' doesn't support member expressions), at position ${expr.object.start}`,
        "interpreter"
      );

    // valid member-expression object
    const runtimeObject = runtimeExprObject as Runtime.ProtoValue;

    // HANDLE PROPERTY
    let computedPropertyType: "key" | "index";
    let computedPropertyValue: string | number;

    // COMPUTED
    if (expr.computed) {
      // make sure that evaluated computed-property is valid (typewise)
      const evaluatedComputedProperty = this.evaluate(expr.property, env);

      switch (evaluatedComputedProperty.type) {
        case "string":
          computedPropertyType = "key";
          computedPropertyValue = (evaluatedComputedProperty as Runtime.String).value;
          break;

        case "number":
          computedPropertyType = "index";
          computedPropertyValue = (evaluatedComputedProperty as Runtime.Number).value;
          break;

        default:
          throw new Err(
            `Invalid member expression. Invalid computed property: '${evaluatedComputedProperty.value}', at position ${expr.property.start}`,
            "interpreter"
          );
      }
    }
    // NOT-COMPUTED
    else {
      // property type is already checked in parser to be an identifier, hence here it's redundant
      computedPropertyType = "key";
      computedPropertyValue = (expr.property as AST_Identifier).value;
    }

    // HANDLE VALUE RETRIEVAL
    let value: Runtime.Value | undefined;

    // KEY
    if (computedPropertyType! === "key") {
      const key = computedPropertyValue as "string";

      switch (runtimeObject.type) {
        case "object": {
          const objValue = (runtimeObject as Runtime.Object).value;

          // look into runtimeObject properties (excluding JS prototype-chain)
          value = objValue.hasOwnProperty(key)
            ? objValue[key]
            : this.lookupPropertyOnPrototypeChain(runtimeObject, key); // if property doesn't exist, look it up on object's prototype

          break;
        }

        default:
          value = this.lookupPropertyOnPrototypeChain(runtimeObject, key);
      }
    }

    // INDEX
    else if (computedPropertyType! === "index") {
      const index = computedPropertyValue as number;

      switch (runtimeObject.type) {
        case "string": {
          const strChar = (runtimeObject as Runtime.String).value[index];

          if (strChar !== undefined) value = MK.STRING(strChar);

          break;
        }

        case "array": {
          value = (runtimeObject as Runtime.Array).value[index];
          break;
        }

        default:
          throw new Err(
            `Invalid computed member expression. Attempted index retrieval on type: '${runtimeObject.type}', at position ${expr.start}`,
            "interpreter"
          );
      }
    }

    // OUTPUT

    const evaluatedMemberExprData: EvaluatedMemberExprData = {
      object: runtimeObject,
      property: computedPropertyValue,
      value: value ?? MK.UNDEFINED(), // return undefined data-type in case property doesn't exist, so that it's always Runtime.Value
    };

    return evaluatedMemberExprData;
  }

  private evalCallExpr(callExpr: AST_CallExpr, env: VariableEnv) {
    const runtimeArgs = callExpr.arguments.map(arg => this.evaluate(arg, env));
    const runtimeCallee = this.evaluate(callExpr.callee, env);

    switch (runtimeCallee.type) {
      case "nativeFunction": {
        const nativeFunc = runtimeCallee as Runtime.NativeFunction;
        const output = nativeFunc.implementation(...runtimeArgs);

        return output;
      }

      case "staticFunction": {
        const staticFunc = runtimeCallee as Runtime.StaticFunction;

        // at this point static-function is already wrapped in wrapperFn
        const output = (staticFunc.implementation as any)(...runtimeArgs);

        return output;
      }

      case "function":
        return this.evalRuntimeFuncCall(runtimeCallee as Runtime.Function, runtimeArgs);

      default:
        throw new Err(
          `Invalid call expression. Invalid callee type: '${runtimeCallee.type}', at position ${callExpr.start}`,
          "interpreter"
        );
    }
  }

  public evalRuntimeFuncCall(func: Runtime.Function, args: Runtime.Value[]): Runtime.Value {
    // function invocations have their own VariableEnv/scope (for parameter creation)
    const funcInvocationEnv = new VariableEnv(func.declarationEnv);

    // CREATE PARAMETER LIST VARIABLES
    func.parameters.forEach((parameter, index) => {
      const value = args[index] ?? MK.UNDEFINED();

      funcInvocationEnv.declareVar(parameter.value, value, { position: parameter.start });
    });

    let funcReturnValue: Runtime.Value = MK.UNDEFINED();

    try {
      this.evalBlockStatement(func.body, funcInvocationEnv);
    } catch (err) {
      if (err instanceof Return) funcReturnValue = err.value; // support 'return' keyword
      else throw err; // propagate exception
    }

    return funcReturnValue;
  }

  private evalBlockStatement(blockStatement: AST_BlockStmt, env: VariableEnv): Runtime.Undefined {
    // blocks have their own VariableEnv/scope
    const blockEnv = new VariableEnv(env);

    // evaluate blockStatement body one statement at a time
    for (const statement of blockStatement.body) this.evaluate(statement, blockEnv);

    return MK.UNDEFINED();
  }

  private evalPrefixUnaryExpr(
    { start, operator, operand }: AST_PrefixUnaryExpr,
    env: VariableEnv
  ): Runtime.Value {
    switch (operator) {
      case "++":
      case "--": {
        // @desc:
        // - these unary operators can only be used with number identifier/member-expression
        // - first update value and then return it

        const { valueAfterUpdate } = this.evalSharedUnaryExprIncrementAndDecrementCode(
          "prefix",
          start,
          operator,
          operand,
          env
        );

        return valueAfterUpdate;
      }

      case "!": {
        // @desc: return opposite of runtime boolean value (runtime value is 'truthy', return "false" / runtime value is 'falsy', return "true")

        const runtimeOperand = this.evaluate(operand, env);

        const operandBooleanValue = getBooleanValue(runtimeOperand.value);
        const operandBooleanRuntimeValue = MK.BOOL(!operandBooleanValue);

        return operandBooleanRuntimeValue;
      }

      case "typeof": {
        // @desc return type of operand (type is returned as runtime-string)

        const runtimeOperand = this.evaluate(operand, env);

        const type = MK.STRING(runtimeOperand.type);

        return type;
      }

      default:
        throw new Err(
          `Invalid prefix unary expression. Unknown operator: '${operator}', at position ${start}`,
          "interpreter"
        );
    }
  }

  private evalPostfixUnaryExpr(
    { operand, operator, start }: AST_PostfixUnaryExpr,
    env: VariableEnv
  ): Runtime.Value {
    switch (operator) {
      case "++":
      case "--": {
        // @desc:
        // - these unary operators can only be used with number identifier/member-expression
        // - first return value and then update it

        const { valueBeforeUpdate } = this.evalSharedUnaryExprIncrementAndDecrementCode(
          "postfix",
          start,
          operator,
          operand,
          env
        );

        return valueBeforeUpdate;
      }

      default:
        throw new Err(
          `Invalid postfix unary expression. Unknown operator: '${operator}', at position ${start}`,
          "interpreter"
        );
    }
  }

  private evalTernaryExpr(expr: AST_TernaryExpr, env: VariableEnv): Runtime.Value {
    const testValue = this.evaluate(expr.test, env).value;
    const testBoolean = getBooleanValue(testValue);

    // TEST IS: 'truthy'
    if (testBoolean) {
      const runtimeConsequent = this.evaluate(expr.consequent, env);
      return runtimeConsequent;
    }

    // TEST IS: 'falsy'
    const runtimeAlternate = this.evaluate(expr.alternate, env);
    return runtimeAlternate;
  }

  private evalIfStatement(ifStatement: AST_IfStmt, env: VariableEnv): Runtime.Undefined {
    const testValue = this.evaluate(ifStatement.test, env).value;
    const testBoolean = getBooleanValue(testValue);

    // TEST IS: 'truthy'
    testBooleanIf: if (testBoolean) {
      this.evaluate(ifStatement.consequent, env);
    }

    // TEST IS: 'falsy'
    else {
      // handle alternate / 'else' keyword
      if (ifStatement.alternate === undefined) break testBooleanIf;

      this.evaluate(ifStatement.alternate, env);
    }

    return MK.UNDEFINED();
  }

  private evalWhileStatement(whileStatement: AST_WhileStmt, env: VariableEnv): Runtime.Undefined {
    const isTestTruthy = () => {
      const testValue = this.evaluate(whileStatement.test, env).value;
      const testBoolean = getBooleanValue(testValue);
      return testBoolean;
    };

    while (isTestTruthy()) {
      try {
        this.evaluate(whileStatement.body, env);
      } catch (err) {
        // supported keywords:
        if (err instanceof Break) break;
        else if (err instanceof Continue) continue;
        // propagate exception
        else throw err;
      }
    }

    return MK.UNDEFINED();
  }

  private evalBinaryExpr(binop: AST_BinaryExpr, env: VariableEnv): Runtime.Value {
    const binopStart = binop.left.start;
    const left = this.evaluate(binop.left, env);
    const right = this.evaluate(binop.right, env);

    // NUMBER
    if (left.type === "number" && right.type === "number") {
      return this.evalNumericBinaryExpr(
        left as Runtime.Number,
        binop.operator,
        right as Runtime.Number,
        binopStart
      );
    }

    // STRING / STRING && NUMBER COMBINATIONS
    else if (this.isValidStringNumberCombination(left.type, right.type)) {
      return this.evalStringBinaryExpr(
        left as Runtime.String,
        binop.operator,
        right as Runtime.Number,
        binopStart
      );
    }

    // HANDLE OTHER DATA-TYPES
    else return this.evalBinaryExprSharedOperators(left, binop.operator, right, binopStart);
  }

  private evalNumericBinaryExpr(
    left: Runtime.Number,
    operator: string,
    right: Runtime.Number,
    start: CharPosition
  ): Runtime.Number | Runtime.Boolean {
    const [lhsValue, rhsValue] = [left.value, right.value];

    switch (operator) {
      // HANDLE UNIQUE OPERATORS

      case "+":
        return MK.NUMBER(lhsValue + rhsValue);

      case "-":
        return MK.NUMBER(lhsValue - rhsValue);

      case "*":
        return MK.NUMBER(lhsValue * rhsValue);

      case "%":
        return MK.NUMBER(lhsValue % rhsValue);

      case "/": {
        // handle division by: '0'
        if (rhsValue === 0)
          throw new Err(
            `Invalid division operation. Operation: '${lhsValue} ${operator} ${rhsValue}' (division by '0' is forbidden), at position: ${start}`,
            "interpreter"
          );

        return MK.NUMBER(lhsValue / rhsValue);
      }

      case ">":
        return MK.BOOL(lhsValue > rhsValue);

      case "<":
        return MK.BOOL(lhsValue < rhsValue);

      case ">=":
        return MK.BOOL(lhsValue >= rhsValue);

      case "<=":
        return MK.BOOL(lhsValue <= rhsValue);

      // HANDLE SHARED OPERATORS
      default:
        return this.evalBinaryExprSharedOperators(left, operator, right, start) as Runtime.Number;
    }
  }

  private evalStringBinaryExpr(
    left: Runtime.String,
    operator: string,
    right: Runtime.Number,
    start: CharPosition
  ): Runtime.String | Runtime.Boolean {
    const [lhsValue, rhsValue] = [left.value, right.value];

    switch (operator) {
      // HANDLE UNIQUE OPERATORS
      case "+":
        return MK.STRING(lhsValue + rhsValue);

      // HANDLE SHARED OPERATORS
      default:
        return this.evalBinaryExprSharedOperators(left, operator, right, start) as Runtime.String;
    }
  }

  // -----------------------------------------------
  //            SHARED HELPER METHODS
  // -----------------------------------------------

  /**@desc `traversePrototypeChain` wrapper, with added benefit of handling `static-functions`*/
  private lookupPropertyOnPrototypeChain(value: Runtime.ProtoValue, key: string): Runtime.Value {
    const property = traversePrototypeChain(value.prototype, key);

    if (property.type === "staticFunction") {
      // wrapperFn is used for passing property into staticFunction
      const wrapperFn = STATIC_FUNCTION((...args) =>
        (property as Runtime.NativeFunction).implementation(value, ...args)
      );

      return wrapperFn;
    }

    return property;
  }

  /**@desc evaluate all shared (among all data-types) binary operators*/
  private evalBinaryExprSharedOperators<T extends Runtime.Value, U extends Runtime.Value>(
    left: T,
    operator: string,
    right: U,
    start: CharPosition
  ): T | U | Runtime.Boolean {
    const lhsValue: unknown = (left as any).value;
    const rhsValue: unknown = (right as any).value;

    switch (operator) {
      case "==":
        return MK.BOOL(lhsValue === rhsValue);

      case "!=":
        return MK.BOOL(lhsValue !== rhsValue);

      // custom AND/OR logic

      case "&&": {
        // 'AND' operator logic:
        // - at least one operand is "falsy" -> return first "falsy" operand
        // - both operands are "truthy" -> return last "truthy" operand

        if (!getBooleanValue(lhsValue)) return left;
        if (!getBooleanValue(rhsValue)) return right;

        // BOTH ARE 'truthy'
        return right;
      }

      case "||": {
        // 'OR' operator logic:
        // - at least one operand is "truthy" -> return first "truthy" operand
        // - both operands are "falsy" -> return last "falsy" operand

        if (getBooleanValue(lhsValue)) return left;
        if (getBooleanValue(rhsValue)) return right;

        // BOTH ARE 'falsy'
        return right;
      }

      default:
        throw new Err(
          `Invalid binary operation. Unsupported use of operator: '${operator}', at position: ${start}`,
          "interpreter"
        );
    }
  }

  /**@desc helper method for `'evalUnaryExpr()'` methods and `'evalAssignmentExpr()'` method, handles value assignment*/
  private handleValueAssignment(
    env: VariableEnv,
    start: CharPosition,
    assigne: AST_Expr,
    newRuntimeValue: Runtime.Value,
    memberExprObj?: Runtime.Object | Runtime.Array,
    memberExprProperty?: string | number
  ) {
    // identifier
    if (assigne.kind === "Identifier") {
      env.assignVar((assigne as AST_Identifier).value, newRuntimeValue, assigne.start);
    }

    // object
    else if (memberExprObj?.type === "object") {
      memberExprObj.value[memberExprProperty!] = newRuntimeValue;
    }

    // array
    else if (memberExprObj?.type === "array") {
      // make sure that memberExprProperty is an index (forbid users from defining/modifying properties on arrays)
      if (typeof memberExprProperty !== "number")
        throw new Err(
          `Invalid member expression value assignment. Defining properties on arrays is forbidden. At position ${start}`,
          "interpreter"
        );

      memberExprObj.value[memberExprProperty as number] = newRuntimeValue;
    }

    // invalid
    else
      throw new Err(
        `Internal interpreter exception. Invalid assignment assigne passed to: 'handleValueAssignment()' method. Assigne: '${assigne}', at position ${assigne.start}`,
        "internal"
      );
  }

  /**@desc helper method for: `'evalPrefixUnaryExpr()'` and `'evalPostfixUnaryExpr'` methods*/
  private evalSharedUnaryExprIncrementAndDecrementCode(
    exprType: "prefix" | "postfix",
    exprStart: CharPosition,
    operator: string,
    operand: AST_Expr,
    env: VariableEnv
  ): SharedUnaryExprOperatorsData {
    const invalidOperandErrorMessage = `Invalid ${exprType} unary expression. Operator: '${operator}' can only be used with number identifier/member-expression\nInvalid operand: '${operand.kind}', at position: ${exprStart}`;

    // VARIABLE DECLARATIONS
    let evaluatedOperandValue: Runtime.Value;
    let memberExprObj: Runtime.Object | Runtime.Array;
    let memberExprProperty: string | number;

    // MAKE SURE THAT OPERAND IS VALID

    // IDENTIFIER
    if (operand.kind === "Identifier") {
      evaluatedOperandValue = this.evalIdentifier(operand as AST_Identifier, env);
    }

    // MEMBER-EXPRESSION
    else if (operand.kind === "MemberExpr") {
      const { object, property, value } = this.evalMemberExpr(operand as AST_MemberExpr, env);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid unary expression. Property modification on type: '${object.type}' is forbidden, at position: ${exprStart}`,
          "interpreter"
        );

      memberExprObj = object as Runtime.Object | Runtime.Array;
      memberExprProperty = property;
      evaluatedOperandValue = value;
    }

    // INVALID OPERAND KIND
    else throw new Err(invalidOperandErrorMessage, "interpreter");

    // MAKE SURE THAT EVALUATED OPERAND IS A NUMBER
    if (evaluatedOperandValue.type !== "number") throw new Err(invalidOperandErrorMessage, "interpreter");
    const operandNumberValue = evaluatedOperandValue as Runtime.Number;

    // HANDLE VALUE ASSIGNMENT
    let newRuntimeOperandValue: Runtime.Number; // computed replacement runtime-value for operand

    // not modyfing '.value' property directly, allows Environment to check whether 'identifier' is a constant variable, and prevent assignment in that case

    // OPERATOR: '++'
    if (operator === "++") {
      newRuntimeOperandValue = MK.NUMBER(operandNumberValue.value + 1);
    }

    // OPERATOR: '--'
    else newRuntimeOperandValue = MK.NUMBER(operandNumberValue.value - 1);

    // VALUE ASSIGNMENT
    this.handleValueAssignment(
      env,
      exprStart,
      operand,
      newRuntimeOperandValue,
      memberExprObj!,
      memberExprProperty!
    );

    // OUTPUT
    const outputObj: SharedUnaryExprOperatorsData = {
      valueBeforeUpdate: operandNumberValue, // operandNumberValue contains reference to the previous runtime NUMBER with unmodified value
      valueAfterUpdate: newRuntimeOperandValue,
    };

    return outputObj;
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc determine whether `type` is a value member-expression `object`*/
  private isValidMemberExpressionObject(type: Runtime.ValueType): boolean {
    return VALID_MEMBER_EXPR_RUNTIME_TYPES.some(validType => validType === type);
  }

  /**@desc determine whether `a` and `b` types form valid string/number combination
  valid combinations: string/string | string/number | number/string*/
  private isValidStringNumberCombination(a: string | number, b: string | number): boolean {
    const validCombinationsRegExpr = /(string string|number string|string number)/;
    const preparedTypes = a + " " + b;

    return validCombinationsRegExpr.test(preparedTypes);
  }
}
