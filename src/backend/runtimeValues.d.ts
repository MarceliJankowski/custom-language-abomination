// -----------------------------------------------
//                RUNTIME TYPES
// -----------------------------------------------
// preface everything with "Runtime" to clear any confusion / prevent name collisions

type Runtime_ValueType = "number" | "null";

interface Runtime_Value {
  type: Runtime_ValueType;
}

interface Runtime_Number extends Runtime_Value {
  type: "number";
  value: number;
}

interface Runtime_Null extends Runtime_Value {
  type: "null";
  value: null;
}
