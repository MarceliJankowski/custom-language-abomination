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
  | "nativeFunc"
  | "null"
  | "undefined";

export interface Value {
  type: ValueType;
  value: unknown;
}

// TYPES WITH PROTOTYPE (containing build-in properties / allowing member-expressions)

/**@desc represents runtime type with access to `prototype-chain`*/
export interface ProtoValue extends Value {
  prototype: { [key: string]: Value };
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

export type NativeFuncImplementation = (args: Value[], env: VariableEnv) => Value;

export interface NativeFunc extends ProtoValue {
  type: "nativeFunc";
  value: NativeFuncImplementation;
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
