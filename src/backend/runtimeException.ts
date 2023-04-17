// PROJECT MODULES
import { Runtime } from "./";

/**@desc Constructor representing exception raised at runtime (thrown within the input program, not by interpreter itself)
It's a wrapper around thrown `Runtime.Value`. Contains additional information on position for debugging purposes
Used throughout `basic-interpreter` for distinguishing exceptions raised within the input program from other exception types*/
export class RuntimeException {
  constructor(public readonly value: Runtime.Value, public readonly position: CharPosition) {}
}
