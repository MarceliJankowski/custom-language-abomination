// PROJECT MODULES
import { Runtime } from "./";

// -----------------------------------------------
//           Runtime.Value FACTORIES
// -----------------------------------------------

// DATA-TYPES WITH PROTOTYPE

// NATIVE FUNC

const NATIVE_FUNC_PROTOTYPE = {};

export function NATIVE_FUNCTION(value: Runtime.NativeFunctionImplementation): Runtime.NativeFunction {
  return {
    type: "nativeFunction",
    value,
    prototype: NATIVE_FUNC_PROTOTYPE,
  };
}

// ARRAY

const ARRAY_PROTOTYPE = {};

export function ARRAY(elements: Runtime.Array["value"] = []): Runtime.Array {
  return {
    type: "array",
    value: elements,
    prototype: ARRAY_PROTOTYPE,
  };
}

// OBJECT

const OBJECT_PROTOTYPE = {};

export function OBJECT(properties: Runtime.Object["value"] = {}): Runtime.Object {
  return {
    type: "object",
    value: properties,
    prototype: OBJECT_PROTOTYPE,
  };
}

// NUMBER

const NUMBER_PROTOTYPE = {};

export function NUMBER(value: number): Runtime.Number {
  return { type: "number", value, prototype: NUMBER_PROTOTYPE };
}

// STRING

const STRING_PROTOTYPE = {};

export function STRING(value: string): Runtime.String {
  return {
    type: "string",
    value,
    prototype: STRING_PROTOTYPE,
  };
}

// BOOL

const BOOL_PROTOTYPE = {};

export function BOOL(value: boolean): Runtime.Boolean {
  return { type: "boolean", value, prototype: BOOL_PROTOTYPE };
}

// DATA-TYPES WITHOUT PROTOTYPE

export function UNDEFINED(): Runtime.Undefined {
  return { type: "undefined", value: undefined };
}

export function NULL(): Runtime.Null {
  return { type: "null", value: null };
}
