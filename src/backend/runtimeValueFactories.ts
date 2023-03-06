// -----------------------------------------------
//           Runtime_Value FACTORIES
// -----------------------------------------------

// DATA-TYPES WITH PROTOTYPE

// ARRAY

const ARRAY_PROTOTYPE = {};

export function ARRAY(elements: Runtime_Array["value"] = []): Runtime_Array {
  return {
    type: "array",
    value: elements,
    prototype: ARRAY_PROTOTYPE,
  };
}

// OBJECT

const OBJECT_PROTOTYPE = {};

export function OBJECT(properties: Runtime_Object["value"] = {}): Runtime_Object {
  return {
    type: "object",
    value: properties,
    prototype: OBJECT_PROTOTYPE,
  };
}

// NUMBER

const NUMBER_PROTOTYPE = {};

export function NUMBER(value: number): Runtime_Number {
  return { type: "number", value, prototype: NUMBER_PROTOTYPE };
}

// STRING

const STRING_PROTOTYPE = {};

export function STRING(value: string): Runtime_String {
  return {
    type: "string",
    value,
    prototype: STRING_PROTOTYPE,
  };
}

// BOOL

const BOOL_PROTOTYPE = {};

export function BOOL(value: boolean): Runtime_Boolean {
  return { type: "boolean", value, prototype: BOOL_PROTOTYPE };
}

// DATA-TYPES WITHOUT PROTOTYPE

export function UNDEFINED(): Runtime_Undefined {
  return { type: "undefined", value: undefined };
}

export function NULL(): Runtime_Null {
  return { type: "null", value: null };
}
