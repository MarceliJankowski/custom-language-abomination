// PROJECT MODULES
import { Runtime, MK } from "./";
import { toString, getLength } from "./staticFunctions";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

type Prototype = Runtime.ProtoValue["prototype"];

// -----------------------------------------------
//               PROTOTYPE-CHAIN
// -----------------------------------------------

export const TOP_PROTOTYPE: Prototype = {
  prototype: null,
  toString,
};

export const ARRAY_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  length: getLength,
};

export const OBJECT_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
};

export const NUMBER_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
};

export const STRING_PROTOTYPE: Prototype = {
  prototype: TOP_PROTOTYPE,
  length: getLength,
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
