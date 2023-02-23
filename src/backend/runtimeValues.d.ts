// -----------------------------------------------
//                RUNTIME TYPES
// -----------------------------------------------
// preface everything with "Runtime" to clear any confusion / prevent name collisions

type Runtime_ValueType = "number" | "string" | "boolean" | "null" | "undefined";

interface Runtime_Value {
  type: Runtime_ValueType;
}

interface Runtime_Number extends Runtime_Value {
  type: "number";
  value: number;
}

interface Runtime_String extends Runtime_Value {
  type: "string";
  value: string;
}

interface Runtime_Boolean extends Runtime_Value {
  type: "boolean";
  value: boolean;
}

interface Runtime_Null extends Runtime_Value {
  type: "null";
  value: null;
}

interface Runtime_Undefined extends Runtime_Value {
  type: "undefined";
  value: undefined;
}
