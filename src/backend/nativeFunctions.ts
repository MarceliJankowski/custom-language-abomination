// PACKAGES
import promptSyncPackage from "prompt-sync";
const promptSync = promptSyncPackage();

// PROJECT MODULES
import { parseForLogging, getBooleanValue, stringifyPretty, removePrototypeChainRecursively } from "../utils";
import { Runtime, MK, RuntimeAPIException } from "./";

// -----------------------------------------------
//           NATIVE FUNCTION FACTORY
// -----------------------------------------------

function NATIVE_FUNCTION(implementation: Runtime.NativeFuncImplementation): Runtime.NativeFunction {
  return {
    type: "nativeFunction",
    value: "nativeFunction", // for logging purposes
    implementation,
    prototype: null,
  };
}

// -----------------------------------------------
//               NATIVE FUNCTIONS
// -----------------------------------------------

/**@desc echo `arguments` to std output*/
export const echo = NATIVE_FUNCTION((_, ...args): Runtime.Undefined => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc terminate process with `exitCode` 
@param exitCode integer in range of `0-255`*/
export const exit = NATIVE_FUNCTION((position, runtimeExitCode): never => {
  if (runtimeExitCode !== undefined) {
    if (runtimeExitCode.type !== "number")
      throw new RuntimeAPIException("exit()", `Invalid exitCode type: '${runtimeExitCode.type}'`, position);

    if (!isValidExitCode(runtimeExitCode.value as number))
      throw new RuntimeAPIException(
        "exit()",
        `Invalid 'exitCode' argument: '${runtimeExitCode.value}' (valid range: 0-255)`,
        position
      );
  }

  const exitCode = (runtimeExitCode?.value as number) ?? 0;

  process.exit(exitCode);
});

/**@desc determine whether given `value` is 'falsy' or 'truthy' (returns corresponding boolean)
@param value in case it isn't provided, it defaults to 'false'*/
export const bool = NATIVE_FUNCTION((_, runtimeValue): Runtime.Boolean => {
  if (runtimeValue === undefined) return MK.BOOL(false);

  const booleanValue = getBooleanValue(runtimeValue);

  return MK.BOOL(booleanValue);
});

/**@desc coerce `value` to `string` data-type
@param value all data-types are valid. In case it isn't provided, it defaults to empty string*/
export const string = NATIVE_FUNCTION((_, runtimeValue): Runtime.String => {
  let value: unknown = "";

  if (runtimeValue) value = parseForLogging(runtimeValue);

  const stringValue = stringifyPretty(value);

  return MK.STRING(stringValue);
});

/**@desc coerce `value` to `number` data-type (returns `null` in case `value` is incoercible)
@param value only numbers and number-coercible strings are valid. In case value isn't provided, it defaults to zero*/
export const number = NATIVE_FUNCTION((position, runtimeValue): Runtime.Null | Runtime.Number => {
  let value: number = 0;

  if (runtimeValue) {
    switch (runtimeValue.type) {
      case "number": {
        value = runtimeValue.value as number;
        break;
      }

      case "string": {
        const coercedValue = Number(runtimeValue.value);

        if (Number.isNaN(coercedValue)) return MK.NULL();

        value = coercedValue;
        break;
      }

      default:
        throw new RuntimeAPIException(
          "Number()",
          `Invalid 'value' argument type: '${runtimeValue.type}'`,
          position
        );
    }
  }

  return MK.NUMBER(value);
});

/**@desc get current date in a `'DD/MM/YYYY'` format*/
export const date = NATIVE_FUNCTION((): Runtime.String => {
  // code stollen from stackoverflow: https://stackoverflow.com/questions/12409299/how-to-get-current-formatted-date-dd-mm-yyyy-in-javascript-and-append-it-to-an-i

  const today = new Date();
  const year = today.getFullYear();
  let month: string | number = today.getMonth() + 1; // months start at 0
  let day: string | number = today.getDate();

  if (day < 10) day = "0" + day;
  if (month < 10) month = "0" + month;

  const formattedToday = day + "/" + month + "/" + year;

  return MK.STRING(formattedToday);
});

/**@desc check virtual clock and return current time in a `'HH:MM:SS'` format*/
export const clock = NATIVE_FUNCTION((): Runtime.String => {
  const time = new Date();
  let hours: string | number = time.getHours();
  let minutes: string | number = time.getMinutes();
  let seconds: string | number = time.getSeconds();

  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;
  if (seconds < 10) seconds = "0" + seconds;

  const formattedTime = hours + ":" + minutes + ":" + seconds;

  return MK.STRING(formattedTime);
});

/**@desc wrapper around javascript's `'Date.now()'` method*/
export const time = NATIVE_FUNCTION((): Runtime.Number => {
  const milliseconds = Date.now();

  return MK.NUMBER(milliseconds);
});

/**@desc builds and returns `Runtime.Object` representing exception
@param message string describing error cause*/
export const Error = NATIVE_FUNCTION((position, runtimeMessage): Runtime.Object => {
  if (runtimeMessage === undefined)
    throw new RuntimeAPIException("Error()", "Missing 'message' argument", position);

  if (runtimeMessage.type !== "string")
    throw new RuntimeAPIException(
      "Error()",
      `Invalid 'message' argument type: ${runtimeMessage.type}`,
      position
    );

  const runtimePosition = MK.ARRAY([MK.NUMBER(position[0]), MK.NUMBER(position[1])]);

  return MK.OBJECT({
    position: runtimePosition,
    message: runtimeMessage,
    // omitting stacktrace cause I'm lazy
  });
});

/**@desc utility meant for easing the pain of test writing. Runs through `values` to make sure that they're truthy, raises exception (with provided `message`) in case they're not*/
export const assert = NATIVE_FUNCTION((position, message, ...runtimeValues): Runtime.Undefined | never => {
  if (message === undefined)
    throw new RuntimeAPIException("assert()", `Missing 'message' argument`, position);

  if (message.type !== "string")
    throw new RuntimeAPIException("assert()", `Invalid 'message' argument type: '${message.type}'`, position);

  if (runtimeValues.length === 0)
    throw new RuntimeAPIException("assert()", `Missing 'value' argument`, position);

  const isEveryRuntimeValueTruthy = runtimeValues.every(value => getBooleanValue(value!));

  if (isEveryRuntimeValueTruthy === false)
    throw new RuntimeAPIException("assert()", (message as Runtime.String).value, position);

  return MK.UNDEFINED();
});

// -----------------------------------------------
//           GLOBAL 'console' OBJECT
// -----------------------------------------------

/**@desc log `arguments` to std output*/
const log = NATIVE_FUNCTION((_, ...args): Runtime.Undefined => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in a `verbose` way*/
const logVerbose = NATIVE_FUNCTION((_, ...args): Runtime.Undefined => {
  const parsedArgs = args.map(arg => removePrototypeChainRecursively(arg!));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in an `ULTRA_VERBOSE` way (including prototype-chain)*/
const logUltraVerbose = NATIVE_FUNCTION((_, ...args): Runtime.Undefined => {
  console.log(...args);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std error*/
const error = NATIVE_FUNCTION((_, ...args): Runtime.Undefined => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.error(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc clear the terminal/console*/
const clear = NATIVE_FUNCTION((): Runtime.Undefined => {
  console.clear();

  return MK.UNDEFINED();
});

/**@desc prompt user for input
@param message string preceding input prompt. If message isn't provided, it defaults to empty string*/
const prompt = NATIVE_FUNCTION((position, runtimeMessage): Runtime.Value => {
  if (runtimeMessage && runtimeMessage.type !== "string")
    throw new RuntimeAPIException(
      "console.prompt()",
      `Invalid 'message' argument type: '${runtimeMessage.type}'`,
      position
    );

  const message = (runtimeMessage?.value as string) ?? "";
  const userInput = promptSync(message);

  const output = MK.STRING(userInput);
  return output;
});

export const CONSOLE = {
  log,
  logVerbose,
  logUltraVerbose,
  error,
  clear,
  prompt,
};

// -----------------------------------------------
//             GLOBAL 'Math' OBJECT
// -----------------------------------------------

/**@desc returns pseudo-random generated `float`. In range of: 0 (inclusive) to 1 (exclusive)*/
const randomFloat = NATIVE_FUNCTION((): Runtime.Number => MK.NUMBER(Math.random()));

/**@desc returns pseudo-random generated `integer`. In range of: `min` (inclusive) to `max` (exclusive)
@param min specifies integer lower limit (inclusive). If omitted it defaults to `0`
@param max specifies integer upper limit (exclusive). If omitted it defaults to `100`*/
const randomInt = NATIVE_FUNCTION((position, runtimeMin, runtimeMax): Runtime.Number => {
  if (runtimeMin && runtimeMin.type !== "number")
    throw new RuntimeAPIException(
      "Math.randomInt()",
      `Invalid 'min' argument type: '${runtimeMin.type}'`,
      position
    );

  if (runtimeMax && runtimeMax.type !== "number")
    throw new RuntimeAPIException(
      "Math.randomInt()",
      `Invalid 'max' argument type: '${runtimeMax.type}'`,
      position
    );

  const min = (runtimeMin?.value ?? 0) as number;
  const max = (runtimeMax?.value ?? 100) as number;
  const randomInteger = Math.floor(Math.random() * (max - min)) + min;

  return MK.NUMBER(randomInteger);
});

/**@desc returns smallest number argument*/
const min = NATIVE_FUNCTION((position, ...args): Runtime.Number => {
  if (args.length === 0) throw new RuntimeAPIException("Math.min()", `No arguments were passed`, position);

  args.forEach(arg => {
    if (arg?.type !== "number")
      throw new RuntimeAPIException("Math.min()", `Invalid argument type: '${arg?.type}'`, position);
  });

  const numbers = args.map(runtimeValue => runtimeValue!.value as number);
  const smallestNumber = Math.min(...numbers);

  return MK.NUMBER(smallestNumber);
});

/**@desc returns largest number argument*/
const max = NATIVE_FUNCTION((position, ...args): Runtime.Number => {
  if (args.length === 0) throw new RuntimeAPIException("Math.max()", `No arguments were passed`, position);

  args.forEach(arg => {
    if (arg?.type !== "number")
      throw new RuntimeAPIException("Math.max()", `Invalid argument type: '${arg?.type}'`, position);
  });

  const numbers = args.map(runtimeValue => runtimeValue!.value as number);
  const largestNumber = Math.max(...numbers);

  return MK.NUMBER(largestNumber);
});

/**@desc returns `number` rounded down to the largest integer less than or equal to `number`*/
const floor = NATIVE_FUNCTION((position, runtimeNumber): Runtime.Number => {
  if (runtimeNumber === undefined)
    throw new RuntimeAPIException("Math.floor()", `Missing 'number' argument`, position);

  if (runtimeNumber.type !== "number")
    throw new RuntimeAPIException(
      "Math.floor()",
      `Invalid 'number' argument type: '${runtimeNumber.type}'`,
      position
    );

  const number = (runtimeNumber as Runtime.Number).value;
  const roundedNumber = Math.floor(number);

  return MK.NUMBER(roundedNumber);
});

/**@desc returns `number` rounded up to the smallest integer greater than or equal to `number`*/
const ceil = NATIVE_FUNCTION((position, runtimeNumber): Runtime.Number => {
  if (runtimeNumber === undefined)
    throw new RuntimeAPIException("Math.ceil()", `Missing 'number' argument`, position);

  if (runtimeNumber.type !== "number")
    throw new RuntimeAPIException(
      "Math.ceil()",
      `Invalid 'number' argument type: '${runtimeNumber.type}'`,
      position
    );

  const number = (runtimeNumber as Runtime.Number).value;
  const roundedNumber = Math.ceil(number);

  return MK.NUMBER(roundedNumber);
});

/**@desc returns `number` rounded to the nearest integer*/
const round = NATIVE_FUNCTION((position, runtimeNumber): Runtime.Number => {
  if (runtimeNumber === undefined)
    throw new RuntimeAPIException("Math.round()", `Missing 'number' argument`, position);

  if (runtimeNumber.type !== "number")
    throw new RuntimeAPIException(
      "Math.round()",
      `Invalid 'number' argument type: '${runtimeNumber.type}'`,
      position
    );

  const number = (runtimeNumber as Runtime.Number).value;
  const roundedNumber = Math.round(number);

  return MK.NUMBER(roundedNumber);
});

export const MATH = { randomFloat, randomInt, min, max, floor, ceil, round };

// -----------------------------------------------
//                    UTILS
// -----------------------------------------------

/**@desc determine whether `exitCode` is valid (in range: `0-255`)*/
function isValidExitCode(exitCode: number): boolean {
  return exitCode >= 0 && exitCode <= 255;
}
