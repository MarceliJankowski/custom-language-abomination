// PROJECT MODULES
import { Runtime } from "./";
import {
  TOP_PROTOTYPE,
  BOOL_PROTOTYPE,
  NUMBER_PROTOTYPE,
  STRING_PROTOTYPE,
  ARRAY_PROTOTYPE,
  OBJECT_PROTOTYPE,
} from "./prototypeChain";

// -----------------------------------------------
//           RUNTIME VALUE FACTORIES
// -----------------------------------------------

// DATA-TYPES WITH PROTOTYPE

export function FUNCTION(
  name: Runtime.Function["name"],
  parameters: Runtime.Function["parameters"],
  body: Runtime.Function["body"],
  declarationEnv: Runtime.Function["declarationEnv"]
): Runtime.Function {
  return {
    type: "function",
    name,
    parameters,
    body,
    declarationEnv,
    value: "[Function: " + name + "]",
    prototype: TOP_PROTOTYPE,
  };
}

export function ARRAY(elements: Runtime.Array["value"] = []): Runtime.Array {
  return {
    type: "array",
    value: elements,
    prototype: ARRAY_PROTOTYPE,
  };
}

export function OBJECT(properties: Runtime.Object["value"] = {}): Runtime.Object {
  return {
    type: "object",
    value: properties,
    prototype: OBJECT_PROTOTYPE,
  };
}

export function NUMBER(value: number): Runtime.Number {
  return { type: "number", value, prototype: NUMBER_PROTOTYPE };
}

export function STRING(value: string): Runtime.String {
  return {
    type: "string",
    value,
    prototype: STRING_PROTOTYPE,
  };
}

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
