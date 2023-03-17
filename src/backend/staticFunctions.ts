// PROJECT MODULES
import { Err, parseForLogging, stringifyPretty } from "../utils";
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

// -----------------------------------------------
//                    STRING
// -----------------------------------------------

/**@desc determine whether `searchTarget` includes/contains `searchString`*/
export const includes = STATIC_FUNCTION((searchTarget, searchString) => {
  if (searchString.type !== "string")
    throw new Err(
      `Invalid searchString argument type: '${searchString.type}' passed to 'includes()' static function`,
      "interpreter"
    );

  const targetValue = (searchTarget as Runtime.String).value;
  const searchStringValue = (searchString as Runtime.String).value;

  const isIncluded = targetValue.includes(searchStringValue);

  return MK.BOOL(isIncluded);
});

/**@desc remove `whitespace` from the `beginning` of a string and return new trimmed string*/
export const trimStart = STATIC_FUNCTION(runtimeString => {
  const stringValue = (runtimeString as Runtime.String).value;
  const trimmedValue = stringValue.trimStart();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from the `end` of a string and return new trimmed string*/
export const trimEnd = STATIC_FUNCTION(runtimeString => {
  const stringValue = (runtimeString as Runtime.String).value;
  const trimmedValue = stringValue.trimEnd();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from `both ends` of a string and return new trimmed string*/
export const trim = STATIC_FUNCTION(runtimeString => {
  const stringValue = (runtimeString as Runtime.String).value;
  const trimmedValue = stringValue.trim();

  return MK.STRING(trimmedValue);
});
