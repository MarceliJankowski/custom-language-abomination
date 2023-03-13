// PROJECT MODULES
import { Err, getBooleanValue } from "../utils";
import { VariableEnv } from "./variableEnv";
import { VALID_MEMBER_EXP_RUNTIME_TYPES } from "../constants";
import { MK, Runtime } from "./";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

interface EvaluatedMemberExpData {
  object: Runtime.ProtoValue;
  property: string | number;
  value: Runtime.Value;
}

interface SharedUnaryExpOperatorsData {
  valueBeforeUpdate: Runtime.Number;
  valueAfterUpdate: Runtime.Number;
}

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
  /**@desc evaluate/interpret `astNode`*/
  public evaluate(astNode: AST_Statement, env: VariableEnv): Runtime.Value {
    switch (astNode.kind) {
      case "Program":
        return this.evalProgram(astNode as AST_Program, env);

      case "NumericLiteral":
        return MK.NUMBER((astNode as AST_NumericLiteral).value);

      case "StringLiteral":
        return MK.STRING((astNode as AST_StringLiteral).value);

      case "ObjectLiteral":
        return this.evalObjectExp(astNode as AST_ObjectLiteral, env);

      case "ArrayLiteral":
        return this.evalArrayExp(astNode as AST_ArrayLiteral, env);

      case "Identifier":
        return this.evalIdentifier(astNode as AST_Identifier, env);

      case "MemberExp":
        return this.evalMemberExp(astNode as AST_MemberExp, env).value;

      case "CallExp":
        return this.evalCallExp(astNode as AST_CallExp, env);

      case "VarDeclaration":
        return this.evalVarDeclaration(astNode as AST_VarDeclaration, env);

      case "FunctionDeclaration":
        return this.evalFuncDeclaration(astNode as AST_FunctionDeclaration, env);

      case "AssignmentExp":
        return this.evalAssignmentExp(astNode as AST_AssignmentExp, env);

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp, env);

      case "PrefixUnaryExp":
        return this.evalPrefixUnaryExp(astNode as AST_PrefixUnaryExp, env);

      case "PostfixUnaryExp":
        return this.evalPostfixUnaryExp(astNode as AST_PostfixUnaryExp, env);

      case "TernaryExp":
        return this.evalTernaryExp(astNode as AST_TernaryExp, env);

      default:
        throw new Err(
          `This AST node-kind has not yet been setup for interpretation.\nNode kind: '${astNode.kind}', at position: ${astNode.start}`,
          "internal"
        );
    }
  }

  // -----------------------------------------------
  //                     EVAL
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

    // allow for uninitialized variable declarations, and "=" assignment operator
    if (varDeclaration.operator !== undefined && varDeclaration.operator !== "=")
      throw new Err(
        `Invalid variable declaration. Invalid assignment operator: '${varDeclaration.operator}' (valid variable declaration assignment operator: '='), at position ${varDeclaration.start}`,
        "interpreter"
      );

    env.declareVar(varDeclaration.identifier, runtimeValue, {
      constant: varDeclaration.constant,
      position: varDeclaration.start,
    });

    // treat variable declaration as a statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalFuncDeclaration(funcDeclaration: AST_FunctionDeclaration, env: VariableEnv): Runtime.Value {
    const { name, parameters, body, start } = funcDeclaration;

    const func = MK.FUNCTION(name, parameters, body, env);

    env.declareVar(name, func, { position: start, constant: true });

    // treat function declaration as a statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalAssignmentExp(assignmentExp: AST_AssignmentExp, env: VariableEnv): Runtime.Value {
    // VARIABLE DECLARATIONS
    const assignmentStart = assignmentExp.start;
    const operator = assignmentExp.operator;
    const assigne = assignmentExp.assigne;

    /**@desc stores runtime `assigne-value`
    Example: identifierAssigne `'x'` with value: `'5'`; assigneValue equals: `runtime-number` with value: `'5'`*/
    let assigneValue: Runtime.Value;
    let computedAssignmentValue: Runtime.Value;
    let memberExpObj: Runtime.Object | Runtime.Array;
    let memberExpProperty: string | number;

    const assignmentValue = this.evaluate(assignmentExp.value, env);

    // HANDLE ASSIGNE

    // identifier
    if (assigne.kind === "Identifier") {
      assigneValue = this.evalIdentifier(assigne as AST_Identifier, env);
    }

    // array/object
    else if (assigne.kind === "MemberExp") {
      const { value, property, object } = this.evalMemberExp(assigne as AST_MemberExp, env);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid assignment-expression. Property assignment on type: '${object.type}' is forbidden, at position: ${assignmentStart}`,
          "interpreter"
        );

      memberExpObj = object as Runtime.Object | Runtime.Array;
      memberExpProperty = property;
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
          computedAssignmentValue = this.evalNumericBinaryExp(
            assigneValue as Runtime.Number,
            extractedBinaryOperator,
            assignmentValue as Runtime.Number,
            assignmentStart
          );

          break;
        }

        // string/string and string/number combinations
        else if (this.isValidStringNumberCombination(assigneValue.type, assignmentValue.type)) {
          computedAssignmentValue = this.evalStringBinaryExp(
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

      case "*=":
      case "-=":
      case "/=":
      case "%=": {
        // @desc valid data types: number/number

        // number/number
        if (assigneValue.type === "number" && assignmentValue.type === "number") {
          const extractedBinaryOperator = operator[0];

          computedAssignmentValue = this.evalNumericBinaryExp(
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

        computedAssignmentValue = this.evalBinaryExpSharedOperators(
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
      memberExpObj!,
      memberExpProperty!
    );

    return computedAssignmentValue; // assignment is treated as expression, hence return the value
  }

  private evalObjectExp({ properties }: AST_ObjectLiteral, env: VariableEnv): Runtime.Value {
    const object: Runtime.Object = MK.OBJECT();

    properties.forEach(({ key, value, start }) => {
      const runtimeValue = value === undefined ? env.lookupVar(key, start) : this.evaluate(value, env);

      object.value[key] = runtimeValue;
    });

    return object;
  }

  private evalArrayExp(exp: AST_ArrayLiteral, env: VariableEnv): Runtime.Value {
    const array: Runtime.Array = MK.ARRAY();

    exp.elements.forEach(value => {
      const runtimeValue = this.evaluate(value, env);

      array.value.push(runtimeValue);
    });

    return array;
  }

  private evalMemberExp(exp: AST_MemberExp, env: VariableEnv): EvaluatedMemberExpData {
    // make sure that 'exp.object' is a valid member-expression object
    const runtimeExpObject = this.evaluate(exp.object, env);

    if (!this.isValidMemberExpressionObject(runtimeExpObject.type))
      throw new Err(
        `Invalid member-expression. Invalid object: '${runtimeExpObject.value}' ('${runtimeExpObject.value}' doesn't support member-expressions), at position ${exp.object.start}`,
        "interpreter"
      );

    // valid member-expression object
    const runtimeObject = runtimeExpObject as Runtime.ProtoValue;

    // HANDLE PROPERTY
    let computedPropertyType: "key" | "index";
    let computedPropertyValue: string | number;

    // COMPUTED
    if (exp.computed) {
      // make sure that evaluated computed-property is valid (typewise)
      const evaluatedComputedProperty = this.evaluate(exp.property, env);

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
            `Invalid member-expression. Invalid computed property: '${evaluatedComputedProperty.value}', at position ${exp.property.start}`,
            "interpreter"
          );
      }
    }
    // NOT-COMPUTED
    else {
      // property type is already checked in parser to be an identifier, hence here it's redundant
      computedPropertyType = "key";
      computedPropertyValue = (exp.property as AST_Identifier).value;
    }

    // HANDLE VALUE RETRIEVAL
    let value: Runtime.Value | undefined;

    // KEY
    if (computedPropertyType! === "key") {
      const key = computedPropertyValue as "string";

      switch (runtimeObject.type) {
        case "object": {
          // if member-expression object is an actual runtime object, first look into it's properties
          value = (runtimeObject as Runtime.Object).value[key];

          // if property doesn't exist, look it up on object's prototype
          if (value === undefined) value = runtimeObject.prototype[key];
          break;
        }

        default:
          value = runtimeObject.prototype[key];
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
            `Invalid computed member-expression. Attempted index retrieval on type: '${runtimeObject.type}', at position ${exp.start}`,
            "interpreter"
          );
      }
    }

    // OUTPUT

    const evaluatedMemberExpData: EvaluatedMemberExpData = {
      object: runtimeObject,
      property: computedPropertyValue,
      value: value ?? MK.UNDEFINED(), // return undefined data-type in case property doesn't exist, so that it's always Runtime.Value
    };

    return evaluatedMemberExpData;
  }

  private evalCallExp(callExp: AST_CallExp, env: VariableEnv) {
    const runtimeArgs = callExp.arguments.map(arg => this.evaluate(arg, env));
    const runtimeCallee = this.evaluate(callExp.callee, env);

    switch (runtimeCallee.type) {
      case "nativeFunction": {
        const nativeFunc = runtimeCallee as Runtime.NativeFunction;
        const output = nativeFunc.implementation(runtimeArgs, env);

        return output;
      }

      case "function": {
        const func = runtimeCallee as Runtime.Function;
        const funcInvocationEnv = new VariableEnv(func.declarationEnv);

        // CREATE PARAMETER LIST VARIABLES
        func.parameters.forEach((parameter, index) => {
          const value = runtimeArgs[index] ?? MK.UNDEFINED();

          funcInvocationEnv.declareVar(parameter.value, value, { position: parameter.start });
        });

        const funcReturnValue: Runtime.Value = MK.UNDEFINED();

        // evaluate function body one statement at a time
        for (const statement of func.body.body) this.evaluate(statement, funcInvocationEnv);

        return funcReturnValue;
      }

      default:
        throw new Err(
          `Invalid call-expression. Invalid callee type: '${runtimeCallee.type}', at position ${callExp.start}`,
          "interpreter"
        );
    }
  }

  private evalPrefixUnaryExp(
    { start, operator, operand }: AST_PrefixUnaryExp,
    env: VariableEnv
  ): Runtime.Value {
    switch (operator) {
      case "++":
      case "--": {
        // @desc:
        // - these unary operators can only be used with number identifier/member-expression
        // - first update value and then return it

        const { valueAfterUpdate } = this.evalSharedUnaryExpIncrementAndDecrementCode(
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

  private evalPostfixUnaryExp(
    { operand, operator, start }: AST_PostfixUnaryExp,
    env: VariableEnv
  ): Runtime.Value {
    switch (operator) {
      case "++":
      case "--": {
        // @desc:
        // - these unary operators can only be used with number identifier/member-expression
        // - first return value and then update it

        const { valueBeforeUpdate } = this.evalSharedUnaryExpIncrementAndDecrementCode(
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

  private evalTernaryExp(exp: AST_TernaryExp, env: VariableEnv): Runtime.Value {
    const runtimeTestValue = this.evaluate(exp.test, env).value;
    const testBoolean = getBooleanValue(runtimeTestValue);

    // TEST IS: 'truthy'
    if (testBoolean) {
      const runtimeConsequent = this.evaluate(exp.consequent, env);
      return runtimeConsequent;
    }

    // TEST IS: 'falsy'
    const runtimeAlternate = this.evaluate(exp.alternate, env);
    return runtimeAlternate;
  }

  private evalBinaryExp(binop: AST_BinaryExp, env: VariableEnv): Runtime.Value {
    const binopStart = binop.left.start;
    const left = this.evaluate(binop.left, env);
    const right = this.evaluate(binop.right, env);

    // NUMBER
    if (left.type === "number" && right.type === "number") {
      return this.evalNumericBinaryExp(
        left as Runtime.Number,
        binop.operator,
        right as Runtime.Number,
        binopStart
      );
    }

    // STRING / STRING && NUMBER COMBINATIONS
    else if (this.isValidStringNumberCombination(left.type, right.type)) {
      return this.evalStringBinaryExp(
        left as Runtime.String,
        binop.operator,
        right as Runtime.Number,
        binopStart
      );
    }

    // HANDLE OTHER DATA-TYPES
    else return this.evalBinaryExpSharedOperators(left, binop.operator, right, binopStart);
  }

  private evalNumericBinaryExp(
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
        return this.evalBinaryExpSharedOperators(left, operator, right, start) as Runtime.Number;
    }
  }

  private evalStringBinaryExp(
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
        return this.evalBinaryExpSharedOperators(left, operator, right, start) as Runtime.String;
    }
  }

  // -----------------------------------------------
  //            SHARED HELPER METHODS
  // -----------------------------------------------

  /**@desc evaluate all shared (among all data-types) binary operators*/
  private evalBinaryExpSharedOperators<T extends Runtime.Value, U extends Runtime.Value>(
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
          `Invalid binary-operation. Unsupported use of operator: '${operator}', at position: ${start}`,
          "interpreter"
        );
    }
  }

  /**@desc helper method for `'evalUnaryExp()'` methods and `'evalAssignmentExp()'` method, handles value assignment*/
  private handleValueAssignment(
    env: VariableEnv,
    start: CharPosition,
    assigne: AST_Expression,
    newRuntimeValue: Runtime.Value,
    memberExpObj?: Runtime.Object | Runtime.Array,
    memberExpProperty?: string | number
  ) {
    // identifier
    if (assigne.kind === "Identifier") {
      env.assignVar((assigne as AST_Identifier).value, newRuntimeValue, assigne.start);
    }

    // object
    else if (memberExpObj?.type === "object") {
      memberExpObj.value[memberExpProperty!] = newRuntimeValue;
    }

    // array
    else if (memberExpObj?.type === "array") {
      // make sure that memberExpProperty is an index (forbid users from defining/modifying properties on arrays)
      if (typeof memberExpProperty !== "number")
        throw new Err(
          `Invalid member-expression value assignment. Defining properties on arrays is forbidden. At position ${start}`,
          "interpreter"
        );

      memberExpObj.value[memberExpProperty as number] = newRuntimeValue;
    }

    // invalid
    else
      throw new Err(
        `Internal interpreter exception. Invalid assignment assigne passed to: 'handleValueAssignment()' method. Assigne: '${assigne}', at position ${assigne.start}`,
        "internal"
      );
  }

  /**@desc helper method for: `'evalPrefixUnaryExp()'` and `'evalPostfixUnaryExp'` methods*/
  private evalSharedUnaryExpIncrementAndDecrementCode(
    expType: "prefix" | "postfix",
    expStart: CharPosition,
    operator: string,
    operand: AST_Expression,
    env: VariableEnv
  ): SharedUnaryExpOperatorsData {
    const invalidOperandErrorMessage = `Invalid ${expType} unary expression. Operator: '${operator}' can only be used with number identifier/member-expression\nInvalid operand: '${operand.kind}', at position: ${expStart}`;

    // VARIABLE DECLARATIONS
    let evaluatedOperandValue: Runtime.Value;
    let memberExpObj: Runtime.Object | Runtime.Array;
    let memberExpProperty: string | number;

    // MAKE SURE THAT OPERAND IS VALID

    // IDENTIFIER
    if (operand.kind === "Identifier") {
      evaluatedOperandValue = this.evalIdentifier(operand as AST_Identifier, env);
    }

    // MEMBER-EXPRESSION
    else if (operand.kind === "MemberExp") {
      const { object, property, value } = this.evalMemberExp(operand as AST_MemberExp, env);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid unary-expression. Property modification on type: '${object.type}' is forbidden, at position: ${expStart}`,
          "interpreter"
        );

      memberExpObj = object as Runtime.Object | Runtime.Array;
      memberExpProperty = property;
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
      expStart,
      operand,
      newRuntimeOperandValue,
      memberExpObj!,
      memberExpProperty!
    );

    // OUTPUT
    const outputObj: SharedUnaryExpOperatorsData = {
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
    return VALID_MEMBER_EXP_RUNTIME_TYPES.some(validType => validType === type);
  }

  /**@desc determine whether `a` and `b` types form valid string/number combination
  valid combinations: string/string | string/number | number/string*/
  private isValidStringNumberCombination(a: string | number, b: string | number): boolean {
    const validCombinationsRegExp = /(string string|number string|string number)/;
    const preparedTypes = a + " " + b;

    return validCombinationsRegExp.test(preparedTypes);
  }
}
