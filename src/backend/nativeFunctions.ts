// PACKAGES
import promptSyncPackage from "prompt-sync";
const promptSync = promptSyncPackage();

// PROJECT MODULES
import {
  Err,
  parseForLogging,
  getBooleanValue,
  stringifyPretty,
  removePrototypeChainRecursively,
} from "../utils";
import { Runtime, MK } from "./";

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
export const echo = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc terminate process with `exitCode` 
@param exitCode integer in range of `0-255`*/
export const exit = NATIVE_FUNCTION(runtimeExitCode => {
  if (runtimeExitCode !== undefined) {
    if (runtimeExitCode.type !== "number")
      throw new Err(
        `Invalid exitCode type: '${runtimeExitCode.type}' passed to 'exit()' native function`,
        "interpreter"
      );

    if (!isValidExitCode(runtimeExitCode.value as number))
      throw new Err(
        `Invalid exitCode argument: '${runtimeExitCode.value}' (valid range: 0-255) passed to 'exit()' native function`,
        "interpreter"
      );
  }

  const exitCode = (runtimeExitCode?.value as number) ?? 0;

  process.exit(exitCode);
});

/**@desc determine whether given `value` is 'falsy' or 'truthy' (returns corresponding boolean)
@param value in case it isn't provided, it defaults to 'false'*/
export const bool = NATIVE_FUNCTION(runtimeValue => {
  if (runtimeValue === undefined) return MK.BOOL(false);

  const value = runtimeValue.value;
  const booleanValue = getBooleanValue(value);

  return MK.BOOL(booleanValue);
});

/**@desc coerce `value` to `string` data-type
@param value all data-types are valid. In case it isn't provided, it defaults to empty string*/
export const string = NATIVE_FUNCTION(runtimeValue => {
  let value: unknown = "";

  if (runtimeValue) value = parseForLogging(runtimeValue);

  const stringValue = stringifyPretty(value);

  return MK.STRING(stringValue);
});

/**@desc coerce `value` to `number` data-type
@param value only numbers and number-coercible strings are valid. In case value isn't provided, it defaults to zero*/
export const number = NATIVE_FUNCTION(runtimeValue => {
  let value: number = 0;

  if (runtimeValue) {
    switch (runtimeValue.type) {
      case "number": {
        value = runtimeValue.value as number;
        break;
      }

      case "string": {
        const coercedValue = Number(runtimeValue.value);

        if (Number.isNaN(coercedValue))
          throw new Err(
            `Invalid value argument: '${runtimeValue.value}' (failed number-coercion) passed to 'Number()' native function`,
            "interpreter"
          );

        value = coercedValue;
        break;
      }

      default:
        throw new Err(
          `Invalid value argument type: '${runtimeValue.type}' passed to 'Number()' native function`,
          "interpreter"
        );
    }
  }

  return MK.NUMBER(value);
});

/**@desc get current date in a `'DD/MM/YYYY'` format*/
export const date = NATIVE_FUNCTION(() => {
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
export const clock = NATIVE_FUNCTION(() => {
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
export const time = NATIVE_FUNCTION(() => {
  const milliseconds = Date.now();

  return MK.NUMBER(milliseconds);
});

// -----------------------------------------------
//           GLOBAL 'console' OBJECT
// -----------------------------------------------

/**@desc log `arguments` to std output*/
const log = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in a `verbose` way*/
const logVerbose = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => removePrototypeChainRecursively(arg!));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in an `ULTRA_VERBOSE` way (including prototype-chain)*/
const logUltraVerbose = NATIVE_FUNCTION((...args) => {
  console.log(...args);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std error*/
const error = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.error(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc clear the terminal/console*/
const clear = NATIVE_FUNCTION(() => {
  console.clear();

  return MK.UNDEFINED();
});

/**@desc prompt user for input
@param message string preceding input prompt. If message isn't provided, it defaults to empty string*/
const prompt = NATIVE_FUNCTION(runtimeMessage => {
  if (runtimeMessage && runtimeMessage.type !== "string")
    throw new Err(
      `Invalid message argument type: '${runtimeMessage.type}' passed to 'console.prompt()' native function`,
      "interpreter"
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
const randomFloat = NATIVE_FUNCTION(() => MK.NUMBER(Math.random()));

/**@desc returns pseudo-random generated `integer`. In range of: `min` (inclusive) to `max` (exclusive)
@param min specifies integer lower limit (inclusive). If omitted it defaults to `0`
@param max specifies integer upper limit (exclusive). If omitted it defaults to `100`*/
const randomInt = NATIVE_FUNCTION((runtimeMin, runtimeMax) => {
  if (runtimeMin && runtimeMin.type !== "number")
    throw new Err(
      `Invalid min argument type: '${runtimeMin.type}' passed to 'Math.randomInt()' native function`,
      "interpreter"
    );

  if (runtimeMax && runtimeMax.type !== "number")
    throw new Err(
      `Invalid max argument type: '${runtimeMax.type}' passed to 'Math.randomInt()' native function`,
      "interpreter"
    );

  const min = (runtimeMin?.value ?? 0) as number;
  const max = (runtimeMax?.value ?? 100) as number;
  const randomInteger = Math.floor(Math.random() * (max - min)) + min;

  return MK.NUMBER(randomInteger);
});

/**@desc returns smallest number argument*/
const min = NATIVE_FUNCTION((...args) => {
  if (args.length === 0)
    throw new Err(`Invalid 'Math.min()' native function invocation, no arguments were passed`, "interpreter");

  args.forEach(arg => {
    if (arg?.type !== "number")
      throw new Err(
        `Invalid argument type: '${arg?.type}' passed to 'Math.min()' native function`,
        "interpreter"
      );
  });

  const numbers = args.map(runtimeValue => runtimeValue!.value as number);
  const smallestNumber = Math.min(...numbers);

  return MK.NUMBER(smallestNumber);
});

/**@desc returns largest number argument*/
const max = NATIVE_FUNCTION((...args) => {
  if (args.length === 0)
    throw new Err(`Invalid 'Math.max()' native function invocation, no arguments were passed`, "interpreter");

  args.forEach(arg => {
    if (arg?.type !== "number")
      throw new Err(
        `Invalid argument type: '${arg?.type}' passed to 'Math.max()' native function`,
        "interpreter"
      );
  });

  const numbers = args.map(runtimeValue => runtimeValue!.value as number);
  const largestNumber = Math.max(...numbers);

  return MK.NUMBER(largestNumber);
});

/**@desc returns `number` rounded down to the largest integer less than or equal to `number`*/
const floor = NATIVE_FUNCTION(runtimeNumber => {
  if (runtimeNumber === undefined)
    throw new Err(`Missing number argument at 'Math.floor()' native function invocation`, "interpreter");

  if (runtimeNumber.type !== "number")
    throw new Err(
      `Invalid number argument type: '${runtimeNumber.type}' passed to 'Math.floor()' native function`,
      "interpreter"
    );

  const number = (runtimeNumber as Runtime.Number).value;
  const roundedNumber = Math.floor(number);

  return MK.NUMBER(roundedNumber);
});

/**@desc returns `number` rounded up to the smallest integer greater than or equal to `number`*/
const ceil = NATIVE_FUNCTION(runtimeNumber => {
  if (runtimeNumber === undefined)
    throw new Err(`Missing number argument at 'Math.ceil()' native function invocation`, "interpreter");

  if (runtimeNumber.type !== "number")
    throw new Err(
      `Invalid number argument type: '${runtimeNumber.type}' passed to 'Math.ceil()' native function`,
      "interpreter"
    );

  const number = (runtimeNumber as Runtime.Number).value;
  const roundedNumber = Math.ceil(number);

  return MK.NUMBER(roundedNumber);
});

/**@desc returns `number` rounded to the nearest integer*/
const round = NATIVE_FUNCTION(runtimeNumber => {
  if (runtimeNumber === undefined)
    throw new Err(`Missing number argument at 'Math.round()' native function invocation`, "interpreter");

  if (runtimeNumber.type !== "number")
    throw new Err(
      `Invalid number argument type: '${runtimeNumber.type}' passed to 'Math.round()' native function`,
      "interpreter"
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
function isValidExitCode(exitCode: number) {
  return exitCode >= 0 && exitCode <= 255;
}
