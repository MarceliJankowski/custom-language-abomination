// PROJECT MODULES
import { Runtime, MK } from "./";
import {
  STATIC_ALL_FUNCTIONS,
  STATIC_STRING_FUNCTIONS,
  STATIC_NUMBER_FUNCTIONS,
  STATIC_ARRAY_FUNCTIONS,
  STATIC_OBJECT_FUNCTIONS,
} from "./staticFunctions";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

type Prototype = Runtime.ProtoValue["prototype"];

// -----------------------------------------------
//               PROTOTYPE-CHAIN
// -----------------------------------------------

export const TOP_PROTOTYPE: Prototype = {
  prototype: null,
  ...STATIC_ALL_FUNCTIONS,
};

export const ARRAY_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  ...STATIC_ARRAY_FUNCTIONS,
};

export const OBJECT_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  ...STATIC_OBJECT_FUNCTIONS,
};

export const NUMBER_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  ...STATIC_NUMBER_FUNCTIONS,
};

export const STRING_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  ...STATIC_STRING_FUNCTIONS,
};

export const BOOL_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
};

// -----------------------------------------------
//          PROTOTYPE-CHAIN TRAVERSAL
// -----------------------------------------------

/**@desc traverse through runtime prototype-chain in search of a `key`*/
export function traversePrototypeChain(
  prototype: Runtime.ProtoValue["prototype"],
  key: string
): Runtime.Value {
  if (prototype === null) return MK.UNDEFINED();

  // retrieve prototypeProperty and make sure it doesn't come from JS build-in prototype-chain
  const prototypeProperty = prototype.hasOwnProperty(key) ? prototype[key] : undefined;

  // if property isn't defined on this prototype, go up the chain
  if (prototypeProperty === undefined) return traversePrototypeChain(prototype.prototype, key);

  // if it's defined, return it
  return prototypeProperty as Runtime.Value;
}
