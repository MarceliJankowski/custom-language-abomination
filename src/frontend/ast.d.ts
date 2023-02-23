// -----------------------------------------------
//                  AST TYPES
// -----------------------------------------------

// prefacing everything with AST because these are globally accessible, this way I'm avoiding confusion and possibility of name collisions

type AST_Node =
  // STATEMENTS
  | "Program"

  // EXPRESSIONS
  | "BinaryExp"

  // LITERALS
  | "NumericLiteral"
  | "StringLiteral"
  | "Identifier";

/**@desc doesn't return any value at run-time*/
interface AST_Statement {
  kind: AST_Node;
  start: CharPosition;
  end: CharPosition;
}

/**@desc it's `AST` root node, represents whole program and contains all statements*/
interface AST_Program extends AST_Statement {
  kind: "Program";
  body: AST_Statement[];
}

/**@desc returns value at run-time*/
interface AST_Expression extends AST_Statement {}

/**@desc represents numberic literal / fixed number*/
interface AST_NumericLiteral extends AST_Expression {
  kind: "NumericLiteral";
  value: number;
}

/**@desc represents string literal / fixed character list*/
interface AST_StringLiteral extends AST_Expression {
  kind: "StringLiteral";
  value: string;
}

/**@desc consists of two `sides` (sides are expressions) seperated by `operator`*/
interface AST_BinaryExp extends AST_Expression {
  kind: "BinaryExp";
  left: AST_Expression;
  right: AST_Expression;
  operator: string;
}

/**@desc represents user-defined identifier like function/variable name*/
interface AST_Identifier extends AST_Expression {
  kind: "Identifier";
  value: string;
}

/**@desc represents string literal / fixed list of characters*/
interface AST_StringLiteral extends AST_Expression {
  kind: "StringLiteral";
  value: string;
}
