// PROJECT MODULES
import { VariableEnv } from "./variableEnv";

// -----------------------------------------------
//                RUNTIME TYPES
// -----------------------------------------------

export type ValueType =
  | "number"
  | "string"
  | "boolean"
  | "object"
  | "array"
  | "nativeFunction"
  | "staticFunction"
  | "function"
  | "null"
  | "undefined";

export interface Value {
  type: ValueType;
  value: unknown;
}

// TYPES WITH PROTOTYPE (containing build-in properties / allowing member-expressions)

/**@desc represents runtime type with access to `prototype-chain`*/
export interface ProtoValue extends Value {
  // using object instead of Map as prototype data-structure, due to typescript inference algorithm limitations (forbidden self-referencing)
  prototype: {
    prototype: ProtoValue["prototype"];
    [key: string]: ProtoValue["prototype"] | Value;
  } | null;
}

export interface Number extends ProtoValue {
  type: "number";
  value: number;
}

export interface String extends ProtoValue {
  type: "string";
  value: string;
}

export interface Object extends ProtoValue {
  type: "object";
  value: { [key: string]: Value };
}

export interface Array extends ProtoValue {
  type: "array";
  value: Value[];
}

export interface Boolean extends ProtoValue {
  type: "boolean";
  value: boolean;
}

export type StaticFuncImplementation = (runtimeValue: Value, ...args: (Value | undefined)[]) => Value;

export interface StaticFunction extends ProtoValue {
  type: "staticFunction";
  implementation: StaticFuncImplementation;
}

export type NativeFuncImplementation = (...args: (Value | undefined)[]) => Value;

export interface NativeFunction extends ProtoValue {
  type: "nativeFunction";
  implementation: NativeFuncImplementation;
}

export interface Function extends ProtoValue {
  type: "function";
  name: string;
  parameters: AST_Identifier[];
  body: AST_BlockStmt;
  declarationEnv: VariableEnv;
}

// TYPES WITHOUT PROTOTYPE (not containing any build-in properties / forbidding member-expressions)

export interface Null extends Value {
  type: "null";
  value: null;
}

export interface Undefined extends Value {
  type: "undefined";
  value: undefined;
}
