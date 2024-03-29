import { parseForLogging, stringifyPretty, getBooleanValue } from "../utils";
import { Runtime, MK, RuntimeAPIException } from "./";
import { interpreter } from "../main";

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
//            ALL RUNTIME DATA-TYPES
// -----------------------------------------------

/**@desc coerce `value` into `string` data-type*/
const toString = STATIC_FUNCTION((runtimeValue): Runtime.String => {
  const parsedValue = parseForLogging(runtimeValue);
  const stringValue = stringifyPretty(parsedValue);

  return MK.STRING(stringValue);
});

export const STATIC_ALL_FUNCTIONS = { toString };

// -----------------------------------------------
//                STRING / ARRAY
// -----------------------------------------------

/**@desc get `string/array` length*/
const getLength = STATIC_FUNCTION((runtimeStringOrArray): Runtime.Number => {
  const length = (runtimeStringOrArray.value as string | []).length;

  return MK.NUMBER(length);
});

/**@desc extracts and returns array/string section, without modifying the original
@param startIndex index of the first element to `include` (if omitted, it defaults to 0)
@param endIndex index of the first element to `exclude` (if omitted, no elements are excluded)*/
const slice = STATIC_FUNCTION(
  (runtimeValue, position, runtimeStart, runtimeEnd): Runtime.String | Runtime.Array => {
    if (runtimeStart && runtimeStart.type !== "number")
      throw new RuntimeAPIException(
        `string.slice()`,
        `Invalid 'startIndex' argument type: '${runtimeStart.type}'`,
        position
      );

    if (runtimeEnd && runtimeEnd.type !== "number")
      throw new RuntimeAPIException(
        "string.slice()",
        `Invalid 'endIndex' argument type: '${runtimeEnd.type}'`,
        position
      );

    const startIndex = (runtimeStart as Runtime.Number | undefined)?.value;
    const endIndex = (runtimeEnd as Runtime.Number | undefined)?.value;

    const slice = (runtimeValue as Runtime.Array | Runtime.String).value.slice(startIndex, endIndex);

    if (runtimeValue.type === "array") return MK.ARRAY(slice as Runtime.Value[]);
    else return MK.STRING(slice as string);
  }
);

// -----------------------------------------------
//                    STRING
// -----------------------------------------------

/**@desc determine whether `searchTarget` includes/contains `searchString`
@param searchString string used as a search pattern*/
const stringIncludes = STATIC_FUNCTION((searchTarget, position, searchString): Runtime.Boolean => {
  if (searchString === undefined)
    throw new RuntimeAPIException("string.includes()", `Missing 'searchString' argument`, position);

  if (searchString.type !== "string")
    throw new RuntimeAPIException(
      "string.includes()",
      `Invalid 'searchString' argument type: '${searchString.type}'`,
      position
    );

  const targetValue = (searchTarget as Runtime.String).value;
  const searchStringValue = (searchString as Runtime.String).value;

  const isIncluded = targetValue.includes(searchStringValue);

  return MK.BOOL(isIncluded);
});

/**@desc remove `whitespace` from the `beginning` of a string and return new trimmed string*/
const trimStart = STATIC_FUNCTION(({ value }): Runtime.String => {
  const trimmedValue = (value as string).trimStart();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from the `end` of a string and return new trimmed string*/
const trimEnd = STATIC_FUNCTION(({ value }): Runtime.String => {
  const trimmedValue = (value as string).trimEnd();

  return MK.STRING(trimmedValue);
});

/**@desc remove `whitespace` from `both ends` of a string and return new trimmed string*/
const trim = STATIC_FUNCTION(({ value }): Runtime.String => {
  const trimmedValue = (value as string).trim();

  return MK.STRING(trimmedValue);
});

/**@desc create and return `uppercased` string counterpart*/
const toUpperCase = STATIC_FUNCTION(({ value }): Runtime.String => {
  const upperCasedStr = (value as string).toUpperCase();

  return MK.STRING(upperCasedStr);
});

/**@desc create and return `lowercased` string counterpart*/
const toLowerCase = STATIC_FUNCTION(({ value }): Runtime.String => {
  const lowerCasedStr = (value as string).toLowerCase();

  return MK.STRING(lowerCasedStr);
});

/**@desc split/divide string by `delimiter` into a string array
@param delimiter string used as a seperator/delimiter*/
const split = STATIC_FUNCTION(({ value }, position, runtimeDelimiter): Runtime.Array => {
  if (runtimeDelimiter && runtimeDelimiter.type !== "string")
    throw new RuntimeAPIException(
      "sting.split()",
      `Invalid 'delimiter' argument type: '${runtimeDelimiter.type}'`,
      position
    );

  const delimiter = (runtimeDelimiter as Runtime.String)?.value;
  const splittedStringArr = (value as string).split(delimiter);
  const runtimeValueArr = splittedStringArr.map(str => MK.STRING(str));

  return MK.ARRAY(runtimeValueArr);
});

/**@desc determine whether string `starts` with `searchString`
@param searchString string used as a search pattern*/
const startsWith = STATIC_FUNCTION(({ value }, position, searchString): Runtime.Boolean => {
  if (searchString === undefined)
    throw new RuntimeAPIException("string.startsWith()", `Missing 'searchString' argument`, position);

  if (searchString.type !== "string")
    throw new RuntimeAPIException(
      "string.startsWith()",
      `Invalid 'searchString' argument type: '${searchString.type}'`,
      position
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const startsWithBoolean = (value as string).startsWith(searchStringValue);

  return MK.BOOL(startsWithBoolean);
});

/**@desc determine whether string `ends` with `searchString`
@param searchString string used as a search pattern*/
const endsWith = STATIC_FUNCTION(({ value }, position, searchString): Runtime.Boolean => {
  if (searchString === undefined)
    throw new RuntimeAPIException("string.endsWith()", `Missing 'searchString' argument`, position);

  if (searchString.type !== "string")
    throw new RuntimeAPIException(
      "string.endsWith()",
      `Invalid 'searchString' argument type: '${searchString.type}'`,
      position
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const endsWithBoolean = (value as string).endsWith(searchStringValue);

  return MK.BOOL(endsWithBoolean);
});

/**@desc searches string and returns starting index of the `first` occurrence of `searchString` or -1 if it's not present*/
const stringIndexOf = STATIC_FUNCTION(({ value }, position, searchString): Runtime.Number => {
  if (searchString === undefined) return MK.NUMBER(-1);

  if (searchString && searchString.type !== "string")
    throw new RuntimeAPIException(
      "string.indexOf()",
      `Invalid 'searchString' argument type: '${searchString.type}'`,
      position
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const index = (value as string).indexOf(searchStringValue);

  return MK.NUMBER(index);
});

/**@desc searches string and returns starting index of the `last` occurrence of `searchString` or -1 if it's not present*/
const stringLastIndexOf = STATIC_FUNCTION(({ value }, position, searchString): Runtime.Number => {
  if (searchString === undefined) return MK.NUMBER(-1);

  if (searchString && searchString.type !== "string")
    throw new RuntimeAPIException(
      "string.lastIndexOf()",
      `Invalid 'searchString' argument type: '${searchString.type}'`,
      position
    );

  const searchStringValue = (searchString as Runtime.String).value;
  const index = (value as string).lastIndexOf(searchStringValue);

  return MK.NUMBER(index);
});

/**@desc repeats string `count` number of times, returns newly created string (doesn't modify the original)
@param count specifies how many times string should be repeated*/
const repeat = STATIC_FUNCTION(({ value }, position, runtimeCount): Runtime.String => {
  if (runtimeCount === undefined)
    throw new RuntimeAPIException("string.repeat()", `Missing count argument`, position);

  if (runtimeCount.type !== "number")
    throw new RuntimeAPIException(
      "string.repeat()",
      `Invalid 'count' argument type: '${runtimeCount.type}'`,
      position
    );

  const count = (runtimeCount as Runtime.Number).value;
  const repeatedStr = (value as string).repeat(count);

  return MK.STRING(repeatedStr);
});

/**@desc replaces first `pattern` occurrence in a string with `replacement`, returns newly created string (doesn't modify the original)
@param pattern string specifying substring meant for replacement
@param replacement string used for replacing substring matched by `pattern`*/
const replace = STATIC_FUNCTION(({ value }, position, runtimePattern, runtimeReplacement): Runtime.String => {
  if (runtimePattern === undefined)
    throw new RuntimeAPIException("string.replace()", `Missing 'pattern' argument`, position);

  if (runtimePattern.type !== "string")
    throw new RuntimeAPIException(
      "string.replace()",
      `Invalid 'pattern' argument type: '${runtimePattern.type}'`,
      position
    );

  if (runtimeReplacement === undefined)
    throw new RuntimeAPIException("string.replace()", `Missing 'replacement' argument`, position);

  if (runtimeReplacement.type !== "string")
    throw new RuntimeAPIException(
      "string.replace()",
      `Invalid 'replacement' argument type: '${runtimeReplacement.type}'`,
      position
    );

  const pattern = (runtimePattern as Runtime.String).value;
  const replacement = (runtimeReplacement as Runtime.String).value;
  const replacedStr = (value as string).replace(pattern, replacement);

  return MK.STRING(replacedStr);
});

/**@desc replaces every `pattern` occurrence in a string with `replacement`, returns newly created string (doesn't modify the original)
@param pattern string specifying substring meant for replacement
@param replacement string used for replacing substring matched by `pattern`*/
const replaceAll = STATIC_FUNCTION(
  ({ value }, position, runtimePattern, runtimeReplacement): Runtime.String => {
    if (runtimePattern === undefined)
      throw new RuntimeAPIException("string.replaceAll()", `Missing 'pattern' argument`, position);

    if (runtimePattern.type !== "string")
      throw new RuntimeAPIException(
        "string.replaceAll()",
        `Invalid 'pattern' argument type: '${runtimePattern.type}'`,
        position
      );

    if (runtimeReplacement === undefined)
      throw new RuntimeAPIException("string.replaceAll()", `Missing 'replacement' argument`, position);

    if (runtimeReplacement.type !== "string")
      throw new RuntimeAPIException(
        "string.replaceAll()",
        `Invalid 'replacement' argument type: '${runtimeReplacement.type}'`,
        position
      );

    const pattern = (runtimePattern as Runtime.String).value;
    const replacement = (runtimeReplacement as Runtime.String).value;
    const replacedStr = (value as string).replaceAll(pattern, replacement);

    return MK.STRING(replacedStr);
  }
);

export const STATIC_STRING_FUNCTIONS = {
  length: getLength,
  includes: stringIncludes,
  trimStart,
  trimEnd,
  trim,
  toUpperCase,
  toLowerCase,
  split,
  startsWith,
  endsWith,
  slice,
  indexOf: stringIndexOf,
  lastIndexOf: stringLastIndexOf,
  repeat,
  replace,
  replaceAll,
};

// -----------------------------------------------
//                    NUMBER
// -----------------------------------------------

/**@desc determine whether `number` is an integer*/
const isInt = STATIC_FUNCTION(({ value }): Runtime.Boolean => {
  const isInteger = Number.isInteger(value as number);

  return MK.BOOL(isInteger);
});

export const STATIC_NUMBER_FUNCTIONS = { isInt };

// -----------------------------------------------
//                    ARRAY
// -----------------------------------------------

/**@desc adds one or more elements to the `end` of an array and returns updated array's length (time-complexity: O(1))*/
const push = STATIC_FUNCTION((runtimeArray, _j, ...elements): Runtime.Number => {
  const array = (runtimeArray as Runtime.Array).value;

  const newLength = array.push(...(elements as Runtime.Value[]));

  return MK.NUMBER(newLength);
});

/**@desc removes the `last` element from an array and returns that removed element (time-complexity: O(1))*/
const pop = STATIC_FUNCTION((runtimeArray): Runtime.Value => {
  const array = (runtimeArray as Runtime.Array).value;

  const removedElement = array.pop();

  return removedElement ?? MK.UNDEFINED();
});

/**@desc adds one or more elements to the `beginning` of an array and returns updated array's length (time-complexity: O(n))*/
const unshift = STATIC_FUNCTION((runtimeArray, _, ...elements): Runtime.Number => {
  const array = (runtimeArray as Runtime.Array).value;

  const newLength = array.unshift(...(elements as Runtime.Value[]));
  return MK.NUMBER(newLength);
});

/**@desc removes the `first` element from an array and returns that removed element (time-complexity: O(n))*/
const shift = STATIC_FUNCTION((runtimeArray): Runtime.Value => {
  const array = (runtimeArray as Runtime.Array).value;

  const removedElement = array.shift();

  return removedElement ?? MK.UNDEFINED();
});

/**@desc modifies array by removing or replacing existing elements
@param startIndex specifies from which element splicing should start
@param deleteCount (optional) number of elements that should be removed, beginning from `startIndex`
@param ...elements (optional) elements to add to the array, beginning from `startIndex`
@return array containing deleted elements*/
const splice = STATIC_FUNCTION(
  (runtimeArray, position, runtimeStartIndex, runtimeDeleteCount, ...runtimeElements): Runtime.Array => {
    if (runtimeStartIndex === undefined)
      throw new RuntimeAPIException("array.splice()", `Missing 'startIndex' argument`, position);

    if (runtimeStartIndex.type !== "number")
      throw new RuntimeAPIException(
        "array.splice()",
        `Invalid 'startIndex' argument type: '${runtimeStartIndex.type}'`,
        position
      );

    if (runtimeDeleteCount === undefined)
      throw new RuntimeAPIException("array.splice()", `Missing 'deleteCount' argument`, position);

    if (runtimeDeleteCount.type !== "number")
      throw new RuntimeAPIException(
        "array.splice()",
        `Invalid 'deleteCount' argument type: '${runtimeDeleteCount.type}'`,
        position
      );

    const startIndex = (runtimeStartIndex as Runtime.Number).value;
    const deleteCount = (runtimeDeleteCount as Runtime.Number).value;
    const deletedElements = (runtimeArray as Runtime.Array).value.splice(
      startIndex,
      deleteCount,
      ...(runtimeElements as Runtime.Value[])
    );

    return MK.ARRAY(deletedElements);
  }
);

/**@desc reverses array in place (modifies original array), returns reference to modified array*/
const reverse = STATIC_FUNCTION((runtimeArray): Runtime.Array => {
  const array = runtimeArray as Runtime.Array;
  array.value.reverse();

  return array;
});

/**@desc creates and returns a new string by concatenating all of the elements in an array, separated by `delimiter`
@param delimiter string used as a seperator/delimiter*/
const join = STATIC_FUNCTION((runtimeArray, position, runtimeDelimiter): Runtime.String => {
  if (runtimeDelimiter === undefined)
    throw new RuntimeAPIException("string.join()", `Missing 'delimiter' argument`, position);

  if (runtimeDelimiter.type !== "string")
    throw new RuntimeAPIException(
      "array.join()",

      `Invalid 'delimiter' argument type: '${runtimeDelimiter.type}'`,
      position
    );

  const delimiter = (runtimeDelimiter as Runtime.String).value;
  const elements = (runtimeArray as Runtime.Array).value.map(runtimeValue => parseForLogging(runtimeValue));
  const joinedElements = elements.join(delimiter);

  return MK.STRING(joinedElements);
});

/**@desc creates and returns new array, by merging two or more arrays together (doesn't modify the original)*/
const concat = STATIC_FUNCTION((runtimeArray, position, ...runtimeValues): Runtime.Array => {
  const arraysToMerge = runtimeValues.flatMap(runtimeValue => {
    if (runtimeValue?.type !== "array")
      throw new RuntimeAPIException(
        "array.concat()",
        `Invalid 'value' argument type: '${runtimeValue?.type}'`,
        position
      );

    return (runtimeValue as Runtime.Array).value;
  });

  const targetArr = (runtimeArray as Runtime.Array).value;
  const mergedArray = targetArr.concat(arraysToMerge);

  return MK.ARRAY(mergedArray);
});

/**@desc returns the `first` index at which a given element can be found in the array, or -1 if it's not present*/
const arrayIndexOf = STATIC_FUNCTION((runtimeArray, _, runtimeSearchElement): Runtime.Number => {
  if (runtimeSearchElement === undefined) return MK.NUMBER(-1);

  const array = (runtimeArray as Runtime.Array).value;
  const searchElement = runtimeSearchElement.value;

  // find and return index of searchElement's first occurrence
  for (let i = 0; i < array.length; i++) if (array[i].value === searchElement) return MK.NUMBER(i);

  return MK.NUMBER(-1);
});

/**@desc returns the `last` index at which a given element can be found in the array, or -1 if it's not present*/
const arrayLastIndexOf = STATIC_FUNCTION((runtimeArray, _, runtimeSearchElement): Runtime.Number => {
  if (runtimeSearchElement === undefined) return MK.NUMBER(-1);

  const array = (runtimeArray as Runtime.Array).value;
  const searchElement = runtimeSearchElement.value;

  // find and return index of searchElement's last occurrence
  for (let i = array.length - 1; i >= 0; i--) if (array[i].value === searchElement) return MK.NUMBER(i);

  return MK.NUMBER(-1);
});

/**@desc determine whether array includes/contains `searchValue` among its entries*/
const arrayIncludes = STATIC_FUNCTION((searchTarget, position, searchRuntimeValue): Runtime.Boolean => {
  if (searchRuntimeValue === undefined)
    throw new RuntimeAPIException("array.includes()", `Missing 'searchValue' argument`, position);

  const array = (searchTarget as Runtime.Array).value;
  const searchValue = searchRuntimeValue.value;

  // try finding searchValue
  for (let i = 0; i < array.length; i++) if (array[i].value === searchValue) return MK.BOOL(true);

  return MK.BOOL(false);
});

/**@desc replaces all array elements with a `value`. Returns modified array*/
const fill = STATIC_FUNCTION((runtimeArray, position, runtimeValue): Runtime.Array => {
  if (runtimeValue === undefined)
    throw new RuntimeAPIException("array.fill()", `Missing 'value' argument`, position);

  const array = (runtimeArray as Runtime.Array).value;

  array.fill(runtimeValue);

  return runtimeArray as Runtime.Array;
});

/**@desc `array.flat()` helper function*/
function flattenArrayRecursively(runtimeArray: Runtime.Array, depth: number): Runtime.Array {
  if (depth <= 0) return runtimeArray;

  const flattenedArray = [];

  // BUILD flattenedArray
  for (const runtimeValue of runtimeArray.value) {
    // HANDLE SUB-ARRAY
    if (runtimeValue.type === "array") {
      const flattenedSubArray = flattenArrayRecursively(runtimeValue as Runtime.Array, depth - 1).value;

      flattenedArray.push(...flattenedSubArray);
    }

    // HANDLE RUNTIME-VALUE
    else flattenedArray.push(runtimeValue);
  }

  return MK.ARRAY(flattenedArray);
}

/**@desc creates a new array with all sub-array elements concatenated into it recursively up to the specified `depth`
@param depth specifies how deep a nested array structure should be flattened (if omitted, defaults to 1)*/
const flat = STATIC_FUNCTION((runtimeArray, position, runtimeDepth): Runtime.Array => {
  if (runtimeDepth && runtimeDepth.type !== "number")
    throw new RuntimeAPIException(
      "array.flat()",
      `Invalid 'depth' argument type: '${runtimeDepth.type}'`,
      position
    );

  const depth = (runtimeDepth as Runtime.Number | undefined)?.value ?? 1;
  const flattenedArray = flattenArrayRecursively(runtimeArray as Runtime.Array, depth);

  return flattenedArray;
});

/**@desc determines whether `at least one` element in the array passes through test implemented in the `callback` function. Returns corresponding boolean
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments). It should return `truthy` value to indicate that element passed the test*/
const some = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Boolean => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.some()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.some()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const outputBoolean = array.some((element, index) =>
    evalCallbackAndReturnItsBooleanValue(callback, element, index, runtimeArray as Runtime.Array)
  );

  return MK.BOOL(outputBoolean);
});

/**@desc determines whether `every` element in the array passes through test implemented in the `callback` function. Returns corresponding boolean
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments). It should return `truthy` value to indicate that element passed the test*/
const every = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Boolean => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.every()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.every()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const outputBoolean = array.every((element, index) =>
    evalCallbackAndReturnItsBooleanValue(callback, element, index, runtimeArray as Runtime.Array)
  );

  return MK.BOOL(outputBoolean);
});

/**@desc returns elements of an array that pass test specified in `callback`
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments). It should return `truthy` value to indicate that element passed the test*/
const filter = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Array => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.filter()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.filter()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const filteredArray = array.filter((element, index) =>
    evalCallbackAndReturnItsBooleanValue(callback, element, index, runtimeArray as Runtime.Array)
  );

  return MK.ARRAY(filteredArray);
});

/**@desc returns `first` element in the array that passes test specified in `callback` (in case no elements pass the test, returns `undefined`)
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments). It should return `truthy` value to indicate that element passed the test*/
const find = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Value => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.find()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.find()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const foundElement = array.find((element, index) =>
    evalCallbackAndReturnItsBooleanValue(callback, element, index, runtimeArray as Runtime.Array)
  );

  return foundElement ?? MK.UNDEFINED();
});

/**@desc returns index of the `first` element in the array that passes test specified in `callback` (in case no elements pass the test, returns `-1`)
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments). It should return `truthy` value to indicate that element passed the test*/
const findIndex = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Number => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.findIndex()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.findIndex()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const foundIndex = array.findIndex((element, index) =>
    evalCallbackAndReturnItsBooleanValue(callback, element, index, runtimeArray as Runtime.Array)
  );

  return MK.NUMBER(foundIndex);
});

/**@desc executes `callback` for each element in the array, returns `undefined`
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments)*/
const forEach = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Undefined => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.forEach()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.forEach()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  for (let i = 0; i < array.length; i++)
    interpreter.evalRuntimeFuncCall(callback, [array[i], MK.NUMBER(i), runtimeArray]);

  return MK.UNDEFINED();
});

/**@desc creates and returns new array populated with `callback` return values
@param callback function executed for each element in the array (invoked with: `element`, `index`, `array` arguments) its return value is pushed into new array*/
const map = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Array => {
  if (runtimeCallback === undefined)
    throw new RuntimeAPIException("array.map()", `Missing 'callback' argument`, position);

  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.map()",
      `Invalid 'callback' argument type: '${runtimeCallback.type}'`,
      position
    );

  const array = (runtimeArray as Runtime.Array).value;
  const callback = runtimeCallback as Runtime.Function;

  const outputArray = array.map((element, index) =>
    interpreter.evalRuntimeFuncCall(callback, [element, MK.NUMBER(index), runtimeArray])
  );

  return MK.ARRAY(outputArray);
});

/**@desc sorts elements in the array based on `compareFunc` (modifies original array), returns reference to sorted array
@param compareFunc specifies sorting order (invoked with: `a` and `b` elements), if omitted default sorting algorithm is used
It's expected to return `0` when both elements are equal, `1` when element `a` is greater than element `b`, and `-1` in the opposite case*/
const sort = STATIC_FUNCTION((runtimeArray, position, runtimeCallback): Runtime.Array => {
  const array = (runtimeArray as Runtime.Array).value;

  // DEFAULT SORT
  if (runtimeCallback === undefined) {
    const outputArray = array.sort((a, b) => {
      const strA = String(a.value);
      const strB = String(b.value);

      if (strA > strB) return 1;
      if (strA < strB) return -1;
      return 0;
    });

    return MK.ARRAY(outputArray);
  }

  // compareFn SORT
  if (runtimeCallback.type !== "function")
    throw new RuntimeAPIException(
      "array.sort()",
      `Invalid 'compareFn' argument type: '${runtimeCallback.type}'`,
      position
    );

  const callback = runtimeCallback as Runtime.Function;

  const outputArray = array.sort((a, b) => {
    const compareFuncOutput = interpreter.evalRuntimeFuncCall(callback, [a, b]);

    if (compareFuncOutput.type !== "number")
      throw new RuntimeAPIException(
        "array.sort()",
        `Invalid compareFn return value type: '${compareFuncOutput.type}'`,
        position
      );

    return compareFuncOutput.value as number;
  });

  return MK.ARRAY(outputArray);
});

export const STATIC_ARRAY_FUNCTIONS = {
  length: getLength,
  push,
  pop,
  unshift,
  shift,
  slice,
  splice,
  reverse,
  join,
  concat,
  indexOf: arrayIndexOf,
  lastIndexOf: arrayLastIndexOf,
  includes: arrayIncludes,
  fill,
  flat,
  some,
  every,
  filter,
  find,
  findIndex,
  forEach,
  map,
  sort,
};

// -----------------------------------------------
//                 ARRAY UTILS
// -----------------------------------------------

/**@desc helper for many array static-functions. evaluates `runtimeCallback` and returns boolean value of its output*/
function evalCallbackAndReturnItsBooleanValue(
  callback: Runtime.Function,
  element: Runtime.Value,
  index: number,
  array: Runtime.Array
): boolean {
  const callbackOutput = interpreter.evalRuntimeFuncCall(callback, [element, MK.NUMBER(index), array]);

  return getBooleanValue(callbackOutput);
}

// -----------------------------------------------
//                    OBJECT
// -----------------------------------------------

/**@desc determine whether given `key` is defined directly on object / is object's own property (doesn't come from prototype-chain)*/
const hasOwn = STATIC_FUNCTION((runtimeObject, position, runtimeKey): Runtime.Boolean => {
  if (runtimeKey === undefined)
    throw new RuntimeAPIException("object.hasOwn()", `Missing 'key' argument`, position);

  if (runtimeKey.type !== "string")
    throw new RuntimeAPIException(
      "object.hasOwn()",
      `Invalid 'key' argument type: '${runtimeKey.type}'`,
      position
    );

  const key = (runtimeKey as Runtime.String).value;
  const hasOwn = Object.hasOwn((runtimeObject as Runtime.Object).value, key);

  return MK.BOOL(hasOwn);
});

/**@desc returns an array of given object's `key-value` pairs*/
const getEntries = STATIC_FUNCTION(({ value }): Runtime.Array => {
  const valueEntries = Object.entries(value as object);

  const runtimeEntries = [];

  // BUILD 'runtimeEntries'
  for (const entry of valueEntries) {
    const runtimeKey = MK.STRING(entry[0]);
    const runtimeValue = entry[1];
    const runtimeEntry = MK.ARRAY([runtimeKey, runtimeValue]);

    runtimeEntries.push(runtimeEntry);
  }

  return MK.ARRAY(runtimeEntries);
});

/**@desc returns an array of given object's `values`*/
const getValues = STATIC_FUNCTION(({ value }): Runtime.Array => {
  const runtimeValues = Object.values(value as object);

  return MK.ARRAY(runtimeValues);
});

/**@desc returns an array of given object's `keys`*/
const getKeys = STATIC_FUNCTION(({ value }): Runtime.Array => {
  const keys = Object.keys(value as object);
  const runtimeKeys = keys.map(key => MK.STRING(key));

  return MK.ARRAY(runtimeKeys);
});

/**@desc modifies object by copying all properties from one or more source objects into it
@param ...sourceObjects objects to copy properties from
@return reference to modified object*/
const assign = STATIC_FUNCTION((runtimeObject, position, ...runtimeSources): Runtime.Object => {
  const sourceObjects = runtimeSources.map(runtimeValue => {
    if (runtimeValue?.type !== "object")
      throw new RuntimeAPIException(
        "object.assign()",
        `Invalid 'source' argument type: '${runtimeValue?.type}'`,
        position
      );

    return (runtimeValue as Runtime.Object).value;
  });

  const targetObj = (runtimeObject as Runtime.Object).value;
  Object.assign(targetObj, ...sourceObjects);

  return runtimeObject as Runtime.Object;
});

export const STATIC_OBJECT_FUNCTIONS = { hasOwn, getEntries, getValues, getKeys, assign };
