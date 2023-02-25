// PROJECT MODULES
import { Err } from "../utils";
import * as MK from "./runtimeValueFactories";
import { VariableEnv } from "./variableEnv";

// -----------------------------------------------
//                    STUFF
// -----------------------------------------------

/**@desc list containing all `falsy` values*/
const FALSY_VALUES = [MK.BOOL(false), MK.UNDEFINED(), MK.NULL(), MK.NUMBER(0)];

/**@desc determine whether given `Runtime_Value` is falsy*/
function isFalsy(value: unknown): boolean {
  return FALSY_VALUES.some(({ value: falsyValue }) => falsyValue === value);
}

/**@desc determine whether given `Runtime_Value` is truthy*/
const isTruthy = (value: unknown): boolean => !isFalsy(value);

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
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

      case "Identifier":
        return this.evalIdentifier(astNode as AST_Identifier);

      case "VarDeclaration":
        return this.evalVarDeclaration(astNode as AST_VarDeclaration);

      case "AssignmentExp":
        return this.evalAssignmentExp(astNode as AssignmentExp);

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp);

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
    const value = varDeclaration.value ? this.evaluate(varDeclaration.value) : MK.UNDEFINED(); // set value for uninitialized variables to undefined

    this.env.declareVar(varDeclaration.identifier, value, {
      constant: varDeclaration.constant,
      position: varDeclaration.start,
    });

    // treat variable declaration as statement, hence return undefined
    return MK.UNDEFINED();
  }

  private evalAssignmentExp(assignmentExp: AssignmentExp): Runtime_Value {
    // make sure that assigne is an identifier
    if (assignmentExp.assigne.kind !== "Identifier")
      throw new Err(
        `Invalid assignment expression. Invalid Assigne kind: '${assignmentExp.assigne.kind}', at position: ${assignmentExp.start}`,
        "interpreter"
      );

    // handle assignment
    const identifier = (assignmentExp.assigne as AST_Identifier).value;
    const value = this.evaluate(assignmentExp.value);
    this.env.assignVar(identifier, value, assignmentExp.start);

    return value;
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
    else if (/(string && number|string && string|number && string)/.test(left.type + " && " + right.type)) {
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

        if (isFalsy(lhsValue)) return left;
        if (isFalsy(rhsValue)) return right;

        // BOTH ARE 'truthy'
        return right;
      }

      case "||": {
        // 'OR' operator logic:
        // - at least one operand is "truthy" -> return first "truthy" operand
        // - both operands are "falsy" -> return last "falsy" operand

        if (isTruthy(lhsValue)) return left;
        if (isTruthy(rhsValue)) return right;

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
            `Invalid division operation.\nOperation: '${lhsValue} ${operator} ${rhsValue}' (division by '0' is forbidden), at position: ${start}`,
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
}
