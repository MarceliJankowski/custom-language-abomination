// PROJECT MODULES
import { MK, Runtime } from "./";

/**@desc Constructor representing exception raised at runtime (thrown within the input program, not by interpreter itself)
It's a wrapper around thrown `Runtime.Value`. Contains additional information on position for debugging purposes
Used throughout `basic-interpreter` for distinguishing exceptions raised within the input program from other exception types*/
export class RuntimeException {
  constructor(public readonly value: Runtime.Value, public readonly position: CharPosition) {}
}

/**@desc Constructor representing exception raised by basic-interpreter `API`
Essentially it's a `RuntimeException` for native and static function implementations*/
export class RuntimeAPIException {
  /**@desc all `RuntimeAPIException` public data packed into `Runtime.Object`*/
  public readonly value: Runtime.Object;

  constructor(
    public readonly thrownBy: string,
    public readonly message: string,
    public readonly position: CharPosition
  ) {
    const runtimeMessage = MK.STRING(message);
    const runtimeThrownBy = MK.STRING(thrownBy);
    const runtimePosition = MK.ARRAY([MK.NUMBER(position[0]), MK.NUMBER(position[1])]);
    // not including stacktrace cause I'm lazy

    this.value = MK.OBJECT({
      message: runtimeMessage,
      thrownBy: runtimeThrownBy,
      position: runtimePosition,
    });
  }
}
