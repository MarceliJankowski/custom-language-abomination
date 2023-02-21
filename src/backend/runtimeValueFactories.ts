// -----------------------------------------------
//           Runtime_Value FACTORIES
// -----------------------------------------------

export function NULL(): Runtime_Null {
  return { type: "null", value: null };
}

export function NUMBER(value: number): Runtime_Number {
  return { type: "number", value };
}
