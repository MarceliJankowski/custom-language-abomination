// PACKAGES
import promptSyncPackage from "prompt-sync";
const promptSync = promptSyncPackage();

// PROJECT MODULES
import { Err, parseForLogging, getBooleanValue, stringifyPretty } from "../utils";
import * as MK from "./runtimeValueFactories";

// -----------------------------------------------
//               NATIVE FUNCTIONS
// -----------------------------------------------

/**@desc log `arguments` to std output in a `non-verbose` way*/
export const log = MK.NATIVE_FUNCTION(args => {
  const parsedArgs = args.map(arg => parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

/**@desc log `arguments` to std output in a `verbose` way*/
export const logVerbose = MK.NATIVE_FUNCTION(args => {
  console.log(...args);

  return MK.UNDEFINED();
});

/**@desc clear the terminal/console*/
export const clear = MK.NATIVE_FUNCTION(() => {
  console.clear();

  return MK.UNDEFINED();
});

/**@desc terminate process with `exitCode` 
@param exitCode integer in range of `0-255`*/
export const exit = MK.NATIVE_FUNCTION(([firstArg]) => {
  if (firstArg !== undefined) {
    if (firstArg.type !== "number")
      throw new Err(
        `Invalid exitCode type: '${firstArg.type}' passed to 'exit()' native function`,
        "interpreter"
      );

    if (!isValidExitCode(firstArg.value as number))
      throw new Err(
        `Invalid exitCode argument: '${firstArg.value}' (valid range: 0-255) passed to 'exit()' native function`,
        "interpreter"
      );
  }

  const exitCode = (firstArg?.value as number) ?? 0;

  process.exit(exitCode);
});

/**@desc prompt user for input
@param message string preceding input prompt. If message isn't provided, it defaults to empty string*/
export const prompt = MK.NATIVE_FUNCTION(([firstArg]) => {
  if (firstArg && firstArg.type !== "string")
    throw new Err(
      `Invalid message argument type: '${firstArg.type}' passed to 'prompt()' native function`,
      "interpreter"
    );

  const message = (firstArg?.value as string) ?? "";
  const userInput = promptSync(message);

  const output = MK.STRING(userInput);
  return output;
});

/**@desc determine whether given `value` is 'falsy' or 'truthy' (returns corresponding boolean)
@param value in case it isn't provided, it defaults to 'false'*/
export const bool = MK.NATIVE_FUNCTION(([firstArg]) => {
  if (firstArg === undefined) return MK.BOOL(false);

  const value = firstArg.value;
  const booleanValue = getBooleanValue(value);

  return MK.BOOL(booleanValue);
});

/**@desc coerce `value` to `string` data-type
@param value all data-types are valid. In case it isn't provided, it defaults to empty string*/
export const string = MK.NATIVE_FUNCTION(([firstArg]) => {
  let value: unknown = "";

  if (firstArg) value = parseForLogging(firstArg);

  const stringValue = stringifyPretty(value);

  return MK.STRING(stringValue);
});

/**@desc coerce `value` to `number` data-type
@param value only numbers and number-coercible strings are valid. In case value isn't provided, it defaults to zero*/
export const number = MK.NATIVE_FUNCTION(([firstArg]) => {
  let value: number = 0;

  if (firstArg) {
    switch (firstArg.type) {
      case "number": {
        value = firstArg.value as number;
        break;
      }

      case "string": {
        const coercedValue = Number(firstArg.value);

        if (Number.isNaN(coercedValue))
          throw new Err(
            `Invalid value argument: '${firstArg.value}' (failed number-coercion) passed to 'Number()' native function`,
            "interpreter"
          );

        value = coercedValue;
        break;
      }

      default:
        throw new Err(
          `Invalid value argument type: '${firstArg.type}' passed to 'Number()' native function`,
          "interpreter"
        );
    }
  }

  return MK.NUMBER(value);
});

// -----------------------------------------------
//                    UTILS
// -----------------------------------------------

/**@desc determine whether `exitCode` is valid (in range: `0-255`)*/
function isValidExitCode(exitCode: number) {
  return exitCode >= 0 && exitCode <= 255;
}
