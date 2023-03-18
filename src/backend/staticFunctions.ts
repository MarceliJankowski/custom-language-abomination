// PROJECT MODULES
import { Err, parseForLogging, stringifyPretty } from "../utils";
import { Runtime, MK } from "./";

// -----------------------------------------------
//           STATIC FUNCTION FACTORY
// -----------------------------------------------
// defining static-function factory here to avoid cyclic-dependency issue

export function STATIC_FUNCTION(implementation: Runtime.StaticFuncImplementation): Runtime.StaticFunction {
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

/**@desc determine whether `searchTarget` includes/contains `searchString`
@param searchString string used as a search pattern*/
export const includes = STATIC_FUNCTION((searchTarget, searchString) => {
  if (searchString === undefined)
    throw new Err(`Missing searchString argument at 'includes()' static function invocation`, "interpreter");

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
export const trimStart = STATIC_FUNCTION(({ value }) => {
  const trimmedValue = (value as string).trimStart();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from the `end` of a string and return new trimmed string*/
export const trimEnd = STATIC_FUNCTION(({ value }) => {
  const trimmedValue = (value as string).trimEnd();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from `both ends` of a string and return new trimmed string*/
export const trim = STATIC_FUNCTION(({ value }) => {
  const trimmedValue = (value as string).trim();

  return MK.STRING(trimmedValue);
});

/**@desc create and return `uppercased` string counterpart*/
export const toUpperCase = STATIC_FUNCTION(({ value }) => {
  const upperCasedStr = (value as string).toUpperCase();

  return MK.STRING(upperCasedStr);
});

/**@desc create and return `lowercased` string counterpart*/
export const toLowerCase = STATIC_FUNCTION(({ value }) => {
  const lowerCasedStr = (value as string).toLowerCase();

  return MK.STRING(lowerCasedStr);
});

/**@desc split/divide string by `delimiter` into a string array
@param delimiter string used as a seperator/delimiter*/
export const split = STATIC_FUNCTION(({ value }, runtimeDelimiter) => {
  if (runtimeDelimiter && runtimeDelimiter.type !== "string")
    throw new Err(
      `Invalid delimiter argument type: '${runtimeDelimiter.type}' passed to 'split()' static function`,
      "interpreter"
    );

  const delimiter = (runtimeDelimiter as Runtime.String)?.value;
  const splittedStringArr = (value as string).split(delimiter);
  const runtimeValueArr = splittedStringArr.map(str => MK.STRING(str));

  return MK.ARRAY(runtimeValueArr);
});

/**@desc determine whether string `starts` with `searchString`
@param searchString string used as a search pattern*/
export const startsWith = STATIC_FUNCTION(({ value }, searchString) => {
  if (searchString === undefined)
    throw new Err(
      `Missing searchString argument at 'startsWith()' static function invocation`,
      "interpreter"
    );

  if (searchString.type !== "string")
    throw new Err(
      `Invalid searchString argument type: '${searchString.type}' passed to 'startsWith()' static function`,
      "interpreter"
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const startsWithBoolean = (value as string).startsWith(searchStringValue);

  return MK.BOOL(startsWithBoolean);
});

/**@desc determine whether string `ends` with `searchString`
@param searchString string used as a search pattern*/
export const endsWith = STATIC_FUNCTION(({ value }, searchString) => {
  if (searchString === undefined)
    throw new Err(`Missing searchString argument at 'endsWith()' static function invocation`, "interpreter");

  if (searchString.type !== "string")
    throw new Err(
      `Invalid searchString argument type: '${searchString.type}' passed to 'endsWith()' static function`,
      "interpreter"
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const endsWithBoolean = (value as string).endsWith(searchStringValue);

  return MK.BOOL(endsWithBoolean);
});

/**@desc extract section of a string and return it as a new string (without modifying the original)
@param startIndex index of the first character to include in the returned string (if omitted, it defaults to 0)
@param endIndex index of the first character to exclude from the returned string (if omitted, no characters are excluded)*/
export const slice = STATIC_FUNCTION(({ value }, runtimeStart, runtimeEnd) => {
  if (runtimeStart && runtimeStart.type !== "number")
    throw new Err(
      `Invalid startIndex argument type: '${runtimeStart.type}' passed to 'slice()' static function`,
      "interpreter"
    );

  if (runtimeEnd && runtimeEnd.type !== "number")
    throw new Err(
      `Invalid endIndex argument type: '${runtimeEnd.type}' passed to 'slice()' static function`,
      "interpreter"
    );

  const startIndex = (runtimeStart as Runtime.Number | undefined)?.value;
  const endIndex = (runtimeEnd as Runtime.Number | undefined)?.value;

  const strSlice = (value as string).slice(startIndex, endIndex);

  return MK.STRING(strSlice);
});

/**@desc searches string and returns starting index of the `first` occurrence of `searchString`
@param searchString string used as a search pattern*/
export const indexOf = STATIC_FUNCTION(({ value }, searchString) => {
  if (searchString === undefined)
    throw new Err(`Missing searchString argument at 'indexOf()' static function invocation`, "interpreter");

  if (searchString.type !== "string")
    throw new Err(
      `Invalid searchString argument type: '${searchString.type}' passed to 'indexOf()' static function`,
      "interpreter"
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const index = (value as string).indexOf(searchStringValue);

  return MK.NUMBER(index);
});

/**@desc searches string and returns starting index of the `last` occurrence of `searchString`
@param searchString string used as a search pattern*/
export const lastIndexOf = STATIC_FUNCTION(({ value }, searchString) => {
  if (searchString === undefined)
    throw new Err(
      `Missing searchString argument at 'lastIndexOf()' static function invocation`,
      "interpreter"
    );

  if (searchString.type !== "string")
    throw new Err(
      `Invalid searchString argument type: '${searchString.type}' passed to 'lastIndexOf()' static function`,
      "interpreter"
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const index = (value as string).lastIndexOf(searchStringValue);

  return MK.NUMBER(index);
});
