// PROJECT MODULES
import { parseForLogging } from "../utils";
import * as MK from "./runtimeValueFactories";

// -----------------------------------------------
//               NATIVE FUNCTIONS
// -----------------------------------------------

export const log = MK.NATIVE_FUNCTION(args => {
  const parsedArgs = args.map(arg => parseForLogging(arg));

  console.log(...parsedArgs);

  return MK.UNDEFINED();
});

export const logVerbose = MK.NATIVE_FUNCTION(args => {
  console.log(...args);

  return MK.UNDEFINED();
});

export const clear = MK.NATIVE_FUNCTION(() => {
  console.clear();

  return MK.UNDEFINED();
});
