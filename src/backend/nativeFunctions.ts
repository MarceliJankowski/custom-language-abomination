// PROJECT MODULES
import { Err, parseForLogging } from "../utils";
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

export const exit = MK.NATIVE_FUNCTION(([firstArg]) => {
  if (firstArg && firstArg.type !== "number")
    throw new Err(
      `Invalid errCode argument type: '${firstArg.type}' passed to 'exit' native function`,
      "interpreter"
    );

  const exitCode = (firstArg?.value as number) ?? 0;

  process.exit(exitCode);
});
