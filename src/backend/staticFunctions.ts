// PROJECT MODULES
import { parseForLogging, stringifyPretty } from "../utils";
import { Runtime, MK } from "./";

// -----------------------------------------------
//           STATIC FUNCTION FACTORY
// -----------------------------------------------
// defining static-function factory here to avoid cyclic-dependency issue

export function STATIC_FUNCTION(
  implementation: Runtime.BuildInFunctionImplementation
): Runtime.StaticFunction {
  return {
    type: "staticFunction",
    value: "staticFunction", // for logging purposes
    implementation,
    prototype: null,
  };
}

// -----------------------------------------------
//           STATIC BUILDIN FUNCTIONS
// -----------------------------------------------

// -----------------------------------------------
//                ALL DATA-TYPES
// -----------------------------------------------

/**@desc coerce `value` into `string` data-type*/
export const toString = STATIC_FUNCTION(runtimeValue => {
  const parsedValue = parseForLogging(runtimeValue);
  const stringValue = stringifyPretty(parsedValue);

  return MK.STRING(stringValue);
});

// -----------------------------------------------
//                STRING / ARRAY
// -----------------------------------------------

/**@desc get `string/array` length*/
export const getLength = STATIC_FUNCTION(runtimeStringOrArray => {
  const length = (runtimeStringOrArray.value as string | []).length;

  return MK.NUMBER(length);
});
