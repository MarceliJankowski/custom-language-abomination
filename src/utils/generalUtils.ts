// PACKAGES
import stringify from "json-stringify-pretty-compact";

// PROJECT MODULES
import { Runtime } from "../backend";
import { RUNTIME_FALSY_VALUES } from "../constants";

// -----------------------------------------------
//                    UTILS
// -----------------------------------------------

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

    default:
      return runtimeValue.value;
  }
}

/**@desc create and return `runtimeValue` shallow copy, with `prototype-chain` recursively excluded*/
export function removePrototypeChainRecursively(
  runtimeValue: Runtime.ProtoValue | Runtime.Value
): Runtime.Value {
  switch (runtimeValue.type) {
    case "array": {
      const arrayShallowCopy = removePrototypeChain(runtimeValue) as Omit<Runtime.Array, "prototype">;

      arrayShallowCopy.value = arrayShallowCopy.value.map(val => removePrototypeChainRecursively(val));

      return arrayShallowCopy;
    }

    case "object": {
      const objectShallowCopy = removePrototypeChain(runtimeValue) as Omit<Runtime.Object, "prototype">;

      for (const [key, value] of Object.entries(objectShallowCopy.value)) {
        objectShallowCopy.value[key] = removePrototypeChainRecursively(value);
      }

      return objectShallowCopy;
    }

    default:
      return removePrototypeChain(runtimeValue);
  }
}

/**@desc create and return `runtimeValue` shallow copy, with excluded `prototype-chain`*/
function removePrototypeChain(runtimeValue: Runtime.Value): Runtime.Value {
  if ((runtimeValue as Runtime.ProtoValue).prototype !== undefined) {
    const { prototype, ...runtimeValueShallowCopyWithoutPrototype } = runtimeValue as Runtime.ProtoValue;

    return runtimeValueShallowCopyWithoutPrototype;
  }

  return runtimeValue;
}

/**@desc determine whether given `value` is 'falsy' or 'truthy' (returns corresponding boolean)*/
export function getBooleanValue(value: unknown): boolean {
  return RUNTIME_FALSY_VALUES.every(({ value: falsyValue }) => falsyValue !== value);
}

type StringifyPrettyOptions = Parameters<typeof stringify>[1];

/**@desc `stringify` package wrapper. It cleans `stringify` output (by removing JSON double-quotes), thus making it `pretty`*/
export function stringifyPretty(value: unknown, options: StringifyPrettyOptions = { indent: 4 }): string {
  if (value === undefined) value = "undefined"; // prevent stringify from receiving undefined value (in which case it returns undefined)

  const stringifyOutput = stringify(value, options);

  const cleanStringifyOutput = stringifyOutput.replace(/(?<!\\)"/g, "").replace(/\\"/g, '"');

  return cleanStringifyOutput;
}
