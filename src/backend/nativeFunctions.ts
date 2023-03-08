// PACKAGES
import promptSyncPackage from "prompt-sync";
const promptSync = promptSyncPackage();

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
