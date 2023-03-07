// PROJECT MODULES
import { Runtime } from "../backend";

// -----------------------------------------------
//                    UTILS
// -----------------------------------------------

/**@desc extract `unique` characters from string array and return them*/
export function getUniqueCharsFromStringArr(arr: string[]): string {
  const uniqueCharsSet = new Set();
  let uniqueCharsStr = "";

  // build uniqueCharsSet
  arr.forEach(string => string.split("").forEach(char => uniqueCharsSet.add(char)));

  // build uniqueCharsStr
  uniqueCharsSet.forEach(uniqueChar => (uniqueCharsStr += uniqueChar));

  return uniqueCharsStr;
}

/**@desc escape `chars` from `inputStr` (escape with backslash), return modified `inputStr`
@parm inputStr string containing `chars` to escape
@param ...chars arguments that come after `inpuStr` are treated as characters to be escaped*/
export function escapeStringChars(inputStr: string, ...chars: string[]) {
  const regExp = new RegExp(`[${chars.join("")}]`, "g");
  const outputStr = inputStr.replace(regExp, match => `\\${match}`);

  return outputStr;
}

/**@desc recursively parse `runtimeValue` to prepare it for logging/printing*/
export function parseForLogging(runtimeValue: Runtime.Value): unknown {
  switch (runtimeValue.type) {
    case "array": {
      const arr = runtimeValue as Runtime.Array;
      return arr.value.map(val => parseForLogging(val));
    }

    case "object": {
      const object = runtimeValue as Runtime.Object;
      const outputObj: { [key: string]: unknown } = {};

      for (const [key, value] of Object.entries(object.value)) {
        outputObj[key] = parseForLogging(value);
      }

      return outputObj;
    }

    case "nativeFunction": {
      return runtimeValue.type;
    }

    default:
      return runtimeValue.value;
  }
}
