// PROJECT MODULES
import { Err } from "../utils";
import * as MK from "./runtimeValueFactories";

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

export class Interpreter {
  /**@desc evaluate/interpret `astNode`*/
  public evaluate(astNode: AST_Statement): Runtime_Value {
    switch (astNode.kind) {
      case "Program":
        return this.evalProgram(astNode as AST_Program);

      case "BinaryExp":
        return this.evalBinaryExp(astNode as AST_BinaryExp);

      case "NumericLiteral":
        return MK.NUMBER((astNode as AST_NumericLiteral).value);

      default:
        throw new Err(
          `This AST node-kind has not yet been setup for interpretation.\nNode kind: '${astNode.kind}'`,
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

  private evalBinaryExp(binop: AST_BinaryExp): Runtime_Value {
    const left = this.evaluate(binop.left);
    const right = this.evaluate(binop.right);

    if (left.type === "number" && right.type === "number")
      return this.evalNumericBinaryExp(left as Runtime_Number, binop.operator, right as Runtime_Number);

    // handle invalid binary operation
    return MK.NULL();
  }

  private evalNumericBinaryExp(
    left: Runtime_Number,
    operator: string,
    right: Runtime_Number
  ): Runtime_Number {
    switch (operator) {
      case "+":
        return MK.NUMBER(left.value + right.value);

      case "-":
        return MK.NUMBER(left.value - right.value);

      case "*":
        return MK.NUMBER(left.value * right.value);

      case "%":
        return MK.NUMBER(left.value % right.value);

      case "/": {
        // handle division by: '0'
        if (right.value === 0)
          throw new Err("Invalid division operation, division by: '0' is not permitted", "interpreter");

        return MK.NUMBER(left.value / right.value);
      }

      // UNRECOGNIZED OPERATOR
      default:
        throw new Err(
          `This AST binary-operator has not yet been setup for interpretation.\nOperator: '${operator}'`,
          "internal"
        );
    }
  }
}
