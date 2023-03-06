// -----------------------------------------------
//                RUNTIME TYPES
// -----------------------------------------------
// preface everything with "Runtime" to clear any confusion / prevent name collisions

type Runtime_ValueType = "number" | "string" | "boolean" | "object" | "array" | "null" | "undefined";

interface Runtime_Value {
  type: Runtime_ValueType;
  value: unknown;
}

// TYPES WITH PROTOTYPE (containing build-in properties / allowing member-expressions)

/**@desc represents runtime type with access to `prototype-chain`*/
interface Runtime_ProtoValue extends Runtime_Value {
  prototype: { [key: string]: Runtime_Value };
}

interface Runtime_Number extends Runtime_ProtoValue {
  type: "number";
  value: number;
}

interface Runtime_String extends Runtime_ProtoValue {
  type: "string";
  value: string;
}

interface Runtime_Object extends Runtime_ProtoValue {
  type: "object";
  properties: { [key: string]: Runtime_Value };
}

interface Runtime_Array extends Runtime_ProtoValue {
  type: "array";
  elements: Runtime_Value[];
}

interface Runtime_Boolean extends Runtime_ProtoValue {
  type: "boolean";
  value: boolean;
}

// TYPES WITHOUT PROTOTYPE (not containing any build-in properties / forbidding member-expressions)

interface Runtime_Null extends Runtime_Value {
  type: "null";
  value: null;
}

interface Runtime_Undefined extends Runtime_Value {
  type: "undefined";
  value: undefined;
}
