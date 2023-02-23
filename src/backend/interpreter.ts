// PROJECT MODULES
import { Err } from "../utils";
import * as MK from "./runtimeValueFactories";
import { VariableEnv } from "./variableEnv";

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

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp);

      default:
        throw new Err(
          `This AST node-kind has not yet been setup for interpretation.\nNode kind: '${astNode.kind}', at position: '${astNode.start}'`,
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

  private evalBinaryExp(binop: AST_BinaryExp): Runtime_Value {
    const binopStart = binop.left.start;
    const left = this.evaluate(binop.left);
    const right = this.evaluate(binop.right);

    // NUMBER
    if (left.type === "number" && right.type === "number") {
      return this.evalNumericBinaryExp(
        (left as Runtime_Number).value,
        binop.operator,
        (right as Runtime_Number).value,
        binopStart
      );
    }

    // STRING
    else if (/(number,string|string,string|string,number)/.test(left.type + "," + right.type)) {
      return this.evalStringBinaryExp(
        (left as Runtime_String).value.toString(),
        binop.operator,
        (right as Runtime_Number).value.toString(),
        binopStart
      );

      // HANDLE INVALID BINARY OPERATION
    } else
      throw new Err(
        `Invalid binary-operation: '${left.type} ${binop.operator} ${right.type}', at position: ${binop.start}`,
        "interpreter"
      );
  }

  private evalNumericBinaryExp(
    lhs: number,
    operator: string,
    rhs: number,
    start: CharPosition
  ): Runtime_Number {
    switch (operator) {
      case "+":
        return MK.NUMBER(lhs + rhs);

      case "-":
        return MK.NUMBER(lhs - rhs);

      case "*":
        return MK.NUMBER(lhs * rhs);

      case "%":
        return MK.NUMBER(lhs % rhs);

      case "/": {
        // handle division by: '0'
        if (rhs === 0)
          throw new Err(
            `Invalid division operation.\nOperation: '${lhs} ${operator} ${rhs}' (division by '0' is forbidden), at position: '${start}'`,
            "interpreter"
          );

        return MK.NUMBER(lhs / rhs);
      }

      // UNRECOGNIZED OPERATOR
      default:
        throw new Err(
          `This binary-operator has not yet been setup for interpretation.\nOperator: '${operator}', at position: '${start}'`,
          "internal"
        );
    }
  }

  private evalStringBinaryExp(
    lhs: string,
    operator: string,
    rhs: string,
    start: CharPosition
  ): Runtime_String {
    if (operator === "+") {
      return MK.STRING(lhs + rhs);
    }

    // UNSUPPORTED OPERATOR
    else {
      throw new Err(
        `Invalid string binary-operation. Unsupported use of operator: '${operator}', at position: '${start}'`,
        "interpreter"
      );
    }
  }
}
