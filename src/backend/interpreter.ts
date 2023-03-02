// PROJECT MODULES
import { Err } from "../utils";
import * as MK from "./runtimeValueFactories";
import { VariableEnv } from "./variableEnv";

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
  /**@desc list containing all runtime `falsy` values*/
  private readonly FALSY_VALUES = [MK.BOOL(false), MK.UNDEFINED(), MK.NULL(), MK.NUMBER(0)];

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

      case "Identifier":
        return this.evalIdentifier(astNode as AST_Identifier);

      case "VarDeclaration":
        return this.evalVarDeclaration(astNode as AST_VarDeclaration);

      case "AssignmentExp":
        return this.evalAssignmentExp(astNode as AssignmentExp);

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp);

      case "PrefixUnaryExp":
        return this.evalPrefixUnaryExp(astNode as AST_PrefixUnaryExp);

      case "PostfixUnaryExp":
        return this.evalPostfixUnaryExp(astNode as AST_PostfixUnaryExp);

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

    // var declarations are only allowed with "=" assignment operator
    if (varDeclaration.operator !== "=")
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

  private evalAssignmentExp(assignmentExp: AssignmentExp): Runtime_Value {
    const assignmentStart = assignmentExp.start;

    // make sure that assigne is an identifier
    if (assignmentExp.assigne.kind !== "Identifier")
      throw new Err(
        `Invalid assignment expression. Invalid Assigne kind: '${assignmentExp.assigne.kind}', at position: ${assignmentStart}`,
        "interpreter"
      );

    const operator = assignmentExp.operator;
    const identifierValue = (assignmentExp.assigne as AST_Identifier).value;

    const prevAssigneValue = this.evalIdentifier(assignmentExp.assigne as AST_Identifier);
    const assignmentValue = this.evaluate(assignmentExp.value);
    let computedAssignmentValue: Runtime_Value; // computed runtime-value for variable assignment

    // COMPUTE RUNTIME-VALUE BASED ON OPERATOR
    switch (assignmentExp.operator) {
      case "=": {
        computedAssignmentValue = assignmentValue;
        break;
      }

      case "+=": {
        // @desc valid data types:
        // number/number | string/string | string/number combinations

        const extractedBinaryOperator = operator[0];

        // number/number
        if (prevAssigneValue.type === "number" && assignmentValue.type === "number") {
          computedAssignmentValue = this.evalNumericBinaryExp(
            prevAssigneValue as Runtime_Number,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
            assignmentStart
          );

          break;
        }

        // string/string and string/number combinations
        else if (this.isValidStringNumberCombination(prevAssigneValue.type, assignmentValue.type)) {
          computedAssignmentValue = this.evalStringBinaryExp(
            prevAssigneValue as Runtime_String,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
            assignmentStart
          );

          break;
        }

        // invalid data types
        else {
          throw new Err(
            `Invalid assignment expression. Operator: '${operator}' incorrectly used with assigne of type: '${prevAssigneValue.type}', at position: ${assignmentStart}`,
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
        if (prevAssigneValue.type === "number" && assignmentValue.type === "number") {
          const extractedBinaryOperator = operator[0];

          computedAssignmentValue = this.evalNumericBinaryExp(
            prevAssigneValue as Runtime_Number,
            extractedBinaryOperator,
            assignmentValue as Runtime_Number,
            assignmentStart
          );

          break;
        }

        // invalid data types
        else {
          throw new Err(
            `Invalid assignment expression. Operator: '${operator}' incorrectly used with assigne of type: '${prevAssigneValue.type}', at position: ${assignmentStart}`,
            "interpreter"
          );
        }
      }

      case "||=":
      case "&&=": {
        // @desc valid data types: any/any
        const extractedLogicalOperator = operator.slice(0, 2);

        computedAssignmentValue = this.evalBinaryExpSharedOperators(
          prevAssigneValue,
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

    // HANDLE ASSIGNMENT
    this.env.assignVar(identifierValue, computedAssignmentValue, assignmentExp.start);

    return computedAssignmentValue; // assignment is treated as expression, hence return the value
  }

  private evalObjectExp({ properties }: AST_ObjectLiteral): Runtime_Value {
    const object: Runtime_Object = { type: "object", value: {} };

    properties.forEach(({ key, value, start }) => {
      const runtimeValue = value === undefined ? this.env.lookupVar(key, start) : this.evaluate(value);

      object.value[key] = runtimeValue;
    });

    return object;
  }

  private evalPrefixUnaryExp({ operator, operand, start }: AST_PrefixUnaryExp): Runtime_Value {
    switch (operator) {
      case "++":
      case "--": {
        // @desc:
        // - these unary operators can only be used with identifier refering to a runtime number
        // - first update identifier's value and then return it

        const errMessage = `Invalid prefix unary expression. Operator: '${operator}' can only be used with identifier of number type.\nInvalid operand: '${operand.kind}', at position: ${operand.start}`;

        if (operand.kind !== "Identifier") throw new Err(errMessage, "interpreter");

        const operandIdentifier = operand as AST_Identifier;
        const operandVar = this.evalIdentifier(operandIdentifier) as Runtime_Number;

        if (operandVar.type !== "number") throw new Err(errMessage, "interpreter");

        if (operator === "++") {
          // by not modyfing '.value' property directly, I'm running Environment check for constant variable assignments
          this.env.assignVar(operandIdentifier.value, MK.NUMBER(operandVar.value + 1), operand.start);
        }
        // operator: '--'
        else this.env.assignVar(operandIdentifier.value, MK.NUMBER(operandVar.value - 1), operand.start);

        return this.evalIdentifier(operandIdentifier); // return updated identifier
      }

      case "!": {
        // @desc: return opposite of runtime boolean value (runtime value is 'truthy', return "false" / runtime value is 'falsy', return "true")

        const runtimeOperand = this.evaluate(operand);

        const operandBooleanValue = this.getBooleanValue(runtimeOperand.value);
        const operandBooleanRuntimeValue = MK.BOOL(!operandBooleanValue);

        return operandBooleanRuntimeValue;
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
        // - these unary operators can only be used with identifier refering to a runtime number
        // - first return identifier's value and then update it

        const errMessage = `Invalid postfix unary expression. Operator: '${operator}' can only be used with identifier of number type.\nInvalid operand: '${operand.kind}', at position: ${operand.start}`;

        if (operand.kind !== "Identifier") throw new Err(errMessage, "interpreter");

        const operandIdentifier = operand as AST_Identifier;
        const operandBeforeUpdate = this.evalIdentifier(operandIdentifier) as Runtime_Number;

        if (operandBeforeUpdate.type !== "number") throw new Err(errMessage, "interpreter");

        if (operator === "++")
          // by not modyfing '.value' property directly, I'm running Environment check for constant variable assignments
          this.env.assignVar(
            operandIdentifier.value,
            MK.NUMBER(operandBeforeUpdate.value + 1),
            operand.start
          );
        // operator: '--'
        else
          this.env.assignVar(
            operandIdentifier.value,
            MK.NUMBER(operandBeforeUpdate.value - 1),
            operand.start
          );

        return operandBeforeUpdate; // operandBeforeUpdate contains reference to the previous NUMBER hash map, which contains previous/not-modified value
      }

      default:
        throw new Err(
          `Invalid postfix unary expression. Unknown operator: '${operator}', at position ${start}`,
          "interpreter"
        );
    }
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
  //                  UTILITIES
  // -----------------------------------------------

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
