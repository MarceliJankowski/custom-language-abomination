// PACKAGES
import promptSyncPackage from "prompt-sync";
const promptSync = promptSyncPackage();

// PROJECT MODULES
import { Err, parseForLogging, getBooleanValue, stringifyPretty } from "../utils";
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

/**@desc log `arguments` to std output*/
export const log = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in a `verbose` way*/
export const logVerbose = NATIVE_FUNCTION((...args) => {
  console.log(...args);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std error*/
export const error = NATIVE_FUNCTION((...args) => {
  const parsedArgs = args.map(arg => arg && parseForLogging(arg));

  console.error(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc clear the terminal/console*/
export const clear = NATIVE_FUNCTION(() => {
  console.clear();

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

/**@desc prompt user for input
@param message string preceding input prompt. If message isn't provided, it defaults to empty string*/
export const prompt = NATIVE_FUNCTION(runtimeMessage => {
  if (runtimeMessage && runtimeMessage.type !== "string")
    throw new Err(
      `Invalid message argument type: '${runtimeMessage.type}' passed to 'prompt()' native function`,
      "interpreter"
    );

  const message = (runtimeMessage?.value as string) ?? "";
  const userInput = promptSync(message);

  const output = MK.STRING(userInput);
  return output;
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
//                    UTILS
// -----------------------------------------------

/**@desc determine whether `exitCode` is valid (in range: `0-255`)*/
function isValidExitCode(exitCode: number) {
  return exitCode >= 0 && exitCode <= 255;
}
