// PROJECT MODULES
import { Err } from "../utils";
import * as MK from "./runtimeValueFactories";
import { VariableEnv } from "./variableEnv";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

interface EvaluatedMemberExpData {
  object: Runtime_ProtoValue;
  property: string | number;
  value: Runtime_Value;
}

interface SharedUnaryExpOperatorsData {
  valueBeforeUpdate: Runtime_Number;
  valueAfterUpdate: Runtime_Number;
}

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
  /**@desc list containing all runtime `falsy` values*/
  private readonly FALSY_VALUES = [MK.BOOL(false), MK.UNDEFINED(), MK.NULL(), MK.NUMBER(0)];

  /**@desc list of all runtime data-types which have 'prototype', meaning that they have their own build-in `properties` and are valid `member-expression` objects*/
  private readonly TYPES_WITH_PROTOTYPE: Runtime_ValueType[] = [
    "number",
    "string",
    "boolean",
    "object",
    "array",
  ];

  constructor(private env: VariableEnv) {}

  /**@desc evaluate/interpret `astNode`*/
  public evaluate(astNode: AST_Statement): Runtime_Value {
    switch (astNode.kind) {
      case "Program":
        return this.evalProgram(astNode as AST_Program);

      case "NumericLiteral":
        return MK.NUMBER((astNode as AST_NumericLiteral).value);

      case "StringLiteral":
        return MK.STRING((astNode as AST_StringLiteral).value);

      case "ObjectLiteral":
        return this.evalObjectExp(astNode as AST_ObjectLiteral);

      case "ArrayLiteral":
        return this.evalArrayExp(astNode as AST_ArrayLiteral);

      case "Identifier":
        return this.evalIdentifier(astNode as AST_Identifier);

      case "MemberExp":
        return this.evalMemberExp(astNode as AST_MemberExp).value;

      case "VarDeclaration":
        return this.evalVarDeclaration(astNode as AST_VarDeclaration);

      case "AssignmentExp":
        return this.evalAssignmentExp(astNode as AST_AssignmentExp);

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp);

      case "PrefixUnaryExp":
        return this.evalPrefixUnaryExp(astNode as AST_PrefixUnaryExp);

      case "PostfixUnaryExp":
        return this.evalPostfixUnaryExp(astNode as AST_PostfixUnaryExp);

      case "TernaryExp":
        return this.evalTernaryExp(astNode as AST_TernaryExp);

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

  private evalProgram(program: AST_Program): Runtime_Value {
    let lastEvaluated: Runtime_Value = MK.NULL();

    for (const statement of program.body) lastEvaluated = this.evaluate(statement);

    return lastEvaluated;
  }

  private evalIdentifier(identifier: AST_Identifier): Runtime_Value {
    return this.env.lookupVar(identifier.value, identifier.start);
  }

  private evalVarDeclaration(varDeclaration: AST_VarDeclaration): Runtime_Value {
    const runtimeValue = varDeclaration.value ? this.evaluate(varDeclaration.value) : MK.UNDEFINED(); // set value for uninitialized variables to undefined

    // allow for uninitialized variable declarations, and "=" assignment operator
    if (varDeclaration.operator !== undefined && varDeclaration.operator !== "=")
      throw new Err(
        `Invalid variable declaration. Invalid assignment operator: '${varDeclaration.operator}' (valid variable declaration assignment operator: '='), at position ${varDeclaration.start}`,
        "interpreter"
      );

    this.env.declareVar(varDeclaration.identifier, runtimeValue, {
      constant: varDeclaration.constant,
      position: varDeclaration.start,
    });

    // treat variable declaration as statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalAssignmentExp(assignmentExp: AST_AssignmentExp): Runtime_Value {
    // VARIABLE DECLARATIONS
    const assignmentStart = assignmentExp.start;
    const operator = assignmentExp.operator;
    const assigne = assignmentExp.assigne;

    /**@desc stores runtime `assigne-value`
    Example: identifierAssigne `'x'` with value: `'5'`; assigneValue equals: `runtime-number` with value: `'5'`*/
    let assigneValue: Runtime_Value;
    let computedAssignmentValue: Runtime_Value;
    let memberExpObj: Runtime_Object | Runtime_Array;
    let memberExpProperty: string | number;

    const assignmentValue = this.evaluate(assignmentExp.value);

    // HANDLE ASSIGNE

    // identifier
    if (assigne.kind === "Identifier") {
      assigneValue = this.evalIdentifier(assigne as AST_Identifier);
    }

    // array/object
    else if (assigne.kind === "MemberExp") {
      const { value, property, object } = this.evalMemberExp(assigne as AST_MemberExp);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid assignment-expression. Property assignment on type: '${object.type}' is forbidden, at position: ${assignmentStart}`,
          "interpreter"
        );

      memberExpObj = object as Runtime_Object | Runtime_Array;
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
            assigneValue as Runtime_Number,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
            assignmentStart
          );

          break;
        }

        // string/string and string/number combinations
        else if (this.isValidStringNumberCombination(assigneValue.type, assignmentValue.type)) {
          computedAssignmentValue = this.evalStringBinaryExp(
            assigneValue as Runtime_String,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
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
            assigneValue as Runtime_Number,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
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
      assignmentStart,
      assigne,
      computedAssignmentValue,
      memberExpObj!,
      memberExpProperty!
    );

    return computedAssignmentValue; // assignment is treated as expression, hence return the value
  }

  private evalObjectExp({ properties }: AST_ObjectLiteral): Runtime_Value {
    const object: Runtime_Object = MK.OBJECT();

    properties.forEach(({ key, value, start }) => {
      const runtimeValue = value === undefined ? this.env.lookupVar(key, start) : this.evaluate(value);

      object.properties[key] = runtimeValue;
    });

    return object;
  }

  private evalArrayExp(exp: AST_ArrayLiteral): Runtime_Value {
    const array: Runtime_Array = MK.ARRAY();

    exp.elements.forEach(value => {
      const runtimeValue = this.evaluate(value);

      array.elements.push(runtimeValue);
    });

    return array;
  }

  private evalMemberExp(exp: AST_MemberExp): EvaluatedMemberExpData {
    // make sure that 'exp.object' is a valid member-expression object
    const runtimeExpObject = this.evaluate(exp.object);

    if (!this.isValidMemberExpressionObject(runtimeExpObject.type))
      throw new Err(
        `Invalid member-expression. Invalid object: '${runtimeExpObject.value}' ('${runtimeExpObject.value}' doesn't support member-expressions), at position ${exp.object.start}`,
        "interpreter"
      );

    // valid member-expression object
    const runtimeObject = runtimeExpObject as Runtime_ProtoValue;

    // HANDLE PROPERTY
    let computedPropertyType: "key" | "index";
    let computedPropertyValue: string | number;

    // COMPUTED
    if (exp.computed) {
      // make sure that evaluated computed-property is valid (typewise)
      const evaluatedComputedProperty = this.evaluate(exp.property);

      switch (evaluatedComputedProperty.type) {
        case "string":
          computedPropertyType = "key";
          computedPropertyValue = (evaluatedComputedProperty as Runtime_String).value;
          break;

        case "number":
          computedPropertyType = "index";
          computedPropertyValue = (evaluatedComputedProperty as Runtime_Number).value;
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
    let value: Runtime_Value | undefined;

    // KEY
    if (computedPropertyType! === "key") {
      const key = computedPropertyValue as "string";

      switch (runtimeObject.type) {
        case "object": {
          // if member-expression object is an actual runtime object, first look into it's properties
          value = (runtimeObject as Runtime_Object).properties[key];

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
          const strChar = (runtimeObject as Runtime_String).value[index];

          if (strChar !== undefined) value = MK.STRING(strChar);

          break;
        }

        case "array": {
          value = (runtimeObject as Runtime_Array).elements[index];
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
      value: value ?? MK.UNDEFINED(), // return undefined data-type in case property doesn't exist, so that it's always Runtime_Value
    };

    return evaluatedMemberExpData;
  }

  private evalPrefixUnaryExp({ start, operator, operand }: AST_PrefixUnaryExp): Runtime_Value {
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
          operand
        );

        return valueAfterUpdate;
      }

      case "!": {
        // @desc: return opposite of runtime boolean value (runtime value is 'truthy', return "false" / runtime value is 'falsy', return "true")

        const runtimeOperand = this.evaluate(operand);

        const operandBooleanValue = this.getBooleanValue(runtimeOperand.value);
        const operandBooleanRuntimeValue = MK.BOOL(!operandBooleanValue);

        return operandBooleanRuntimeValue;
      }

      case "typeof": {
        // @desc return type of operand (type is returned as runtime-string)

        const runtimeOperand = this.evaluate(operand);

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

  private evalPostfixUnaryExp({ operand, operator, start }: AST_PostfixUnaryExp): Runtime_Value {
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
          operand
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

  private evalTernaryExp(exp: AST_TernaryExp): Runtime_Value {
    const runtimeTestValue = this.evaluate(exp.test).value;
    const testBoolean = this.getBooleanValue(runtimeTestValue);

    // TEST IS: 'truthy'
    if (testBoolean) {
      const runtimeConsequent = this.evaluate(exp.consequent);
      return runtimeConsequent;
    }

    // TEST IS: 'falsy'
    const runtimeAlternate = this.evaluate(exp.alternate);
    return runtimeAlternate;
  }

  private evalBinaryExp(binop: AST_BinaryExp): Runtime_Value {
    const binopStart = binop.left.start;
    const left = this.evaluate(binop.left);
    const right = this.evaluate(binop.right);

    // NUMBER
    if (left.type === "number" && right.type === "number") {
      return this.evalNumericBinaryExp(
        left as Runtime_Number,
        binop.operator,
        right as Runtime_Number,
        binopStart
      );
    }

    // STRING / STRING && NUMBER COMBINATIONS
    else if (this.isValidStringNumberCombination(left.type, right.type)) {
      return this.evalStringBinaryExp(
        left as Runtime_String,
        binop.operator,
        right as Runtime_Number,
        binopStart
      );
    }

    // HANDLE OTHER DATA-TYPES
    else return this.evalBinaryExpSharedOperators(left, binop.operator, right, binopStart);
  }

  private evalNumericBinaryExp(
    left: Runtime_Number,
    operator: string,
    right: Runtime_Number,
    start: CharPosition
  ): Runtime_Number | Runtime_Boolean {
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
        return this.evalBinaryExpSharedOperators(left, operator, right, start) as Runtime_Number;
    }
  }

  private evalStringBinaryExp(
    left: Runtime_String,
    operator: string,
    right: Runtime_Number,
    start: CharPosition
  ): Runtime_String | Runtime_Boolean {
    const [lhsValue, rhsValue] = [left.value, right.value];

    switch (operator) {
      // HANDLE UNIQUE OPERATORS
      case "+":
        return MK.STRING(lhsValue + rhsValue);

      // HANDLE SHARED OPERATORS
      default:
        return this.evalBinaryExpSharedOperators(left, operator, right, start) as Runtime_String;
    }
  }

  // -----------------------------------------------
  //            SHARED HELPER METHODS
  // -----------------------------------------------

  /**@desc evaluate all shared (among all data-types) binary operators*/
  private evalBinaryExpSharedOperators<T extends Runtime_Value, U extends Runtime_Value>(
    left: T,
    operator: string,
    right: U,
    start: CharPosition
  ): T | U | Runtime_Boolean {
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

        if (this.isFalsy(lhsValue)) return left;
        if (this.isFalsy(rhsValue)) return right;

        // BOTH ARE 'truthy'
        return right;
      }

      case "||": {
        // 'OR' operator logic:
        // - at least one operand is "truthy" -> return first "truthy" operand
        // - both operands are "falsy" -> return last "falsy" operand

        if (this.isTruthy(lhsValue)) return left;
        if (this.isTruthy(rhsValue)) return right;

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
    start: CharPosition,
    assigne: AST_Expression,
    newRuntimeValue: Runtime_Value,
    memberExpObj?: Runtime_Object | Runtime_Array,
    memberExpProperty?: string | number
  ) {
    // identifier
    if (assigne.kind === "Identifier") {
      this.env.assignVar((assigne as AST_Identifier).value, newRuntimeValue, assigne.start);
    }

    // object
    else if (memberExpObj?.type === "object") {
      memberExpObj.properties[memberExpProperty!] = newRuntimeValue;
    }

    // array
    else if (memberExpObj?.type === "array") {
      // make sure that memberExpProperty is an index (forbid users from defining/modifying properties on arrays)
      if (typeof memberExpProperty !== "number")
        throw new Err(
          `Invalid member-expression value assignment. Defining properties on arrays is forbidden. At position ${start}`,
          "interpreter"
        );

      memberExpObj.elements[memberExpProperty as number] = newRuntimeValue;
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
    operand: AST_Expression
  ): SharedUnaryExpOperatorsData {
    const invalidOperandErrorMessage = `Invalid ${expType} unary expression. Operator: '${operator}' can only be used with number identifier/member-expression\nInvalid operand: '${operand.kind}', at position: ${expStart}`;

    // VARIABLE DECLARATIONS
    let evaluatedOperandValue: Runtime_Value;
    let memberExpObj: Runtime_Object | Runtime_Array;
    let memberExpProperty: string | number;

    // MAKE SURE THAT OPERAND IS VALID

    // IDENTIFIER
    if (operand.kind === "Identifier") {
      evaluatedOperandValue = this.evalIdentifier(operand as AST_Identifier);
    }

    // MEMBER-EXPRESSION
    else if (operand.kind === "MemberExp") {
      const { object, property, value } = this.evalMemberExp(operand as AST_MemberExp);

      if (object.type !== "object" && object.type !== "array")
        throw new Err(
          `Invalid unary-expression. Property modification on type: '${object.type}' is forbidden, at position: ${expStart}`,
          "interpreter"
        );

      memberExpObj = object as Runtime_Object;
      memberExpProperty = property;
      evaluatedOperandValue = value;
    }

    // INVALID OPERAND KIND
    else throw new Err(invalidOperandErrorMessage, "interpreter");

    // MAKE SURE THAT EVALUATED OPERAND IS A NUMBER
    if (evaluatedOperandValue.type !== "number") throw new Err(invalidOperandErrorMessage, "interpreter");
    const operandNumberValue = evaluatedOperandValue as Runtime_Number;

    // HANDLE VALUE ASSIGNMENT
    let newRuntimeOperandValue: Runtime_Number; // computed replacement runtime-value for operand

    // not modyfing '.value' property directly, allows Environment to check whether 'identifier' is a constant variable, and prevent assignment in that case

    // OPERATOR: '++'
    if (operator === "++") {
      newRuntimeOperandValue = MK.NUMBER(operandNumberValue.value + 1);
    }

    // OPERATOR: '--'
    else newRuntimeOperandValue = MK.NUMBER(operandNumberValue.value - 1);

    // VALUE ASSIGNMENT
    this.handleValueAssignment(expStart, operand, newRuntimeOperandValue, memberExpObj!, memberExpProperty!);

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
  private isValidMemberExpressionObject(type: Runtime_ValueType): boolean {
    return this.TYPES_WITH_PROTOTYPE.some(validType => validType === type);
  }

  /**@desc determine whether `a` and `b` types form valid string/number combination
  valid combinations: string/string | string/number | number/string*/
  private isValidStringNumberCombination(a: string | number, b: string | number): boolean {
    const validCombinationsRegExp = /(string string|number string|string number)/;
    const preparedTypes = a + " " + b;

    return validCombinationsRegExp.test(preparedTypes);
  }

  /**@desc determine whether given `Runtime_Value`.value is 'falsy' or 'truthy' (returns corresponding boolean)*/
  private getBooleanValue(value: unknown): boolean {
    return this.isTruthy(value);
  }

  /**@desc determine whether given `Runtime_Value`.value is falsy*/
  private isFalsy(value: unknown): boolean {
    return this.FALSY_VALUES.some(({ value: falsyValue }) => falsyValue === value);
  }

  /**@desc determine whether given `Runtime_Value`.value is truthy*/
  private isTruthy(value: unknown): boolean {
    return !this.isFalsy(value);
  }
}
