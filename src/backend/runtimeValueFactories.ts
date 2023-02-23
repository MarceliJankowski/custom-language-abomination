// -----------------------------------------------
//           Runtime_Value FACTORIES
// -----------------------------------------------

export function NUMBER(value: number): Runtime_Number {
  return { type: "number", value };
}

export function STRING(value: string): Runtime_String {
  return { type: "string", value };
}

export function BOOL(value: boolean): Runtime_Boolean {
  return { type: "boolean", value };
}

export function UNDEFINED(): Runtime_Undefined {
  return { type: "undefined", value: undefined };
}

export function NULL(): Runtime_Null {
  return { type: "null", value: null };
}
