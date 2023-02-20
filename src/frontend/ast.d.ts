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
  | "Identifier";

/**@desc doesn't return any value at run-time*/
interface AST_Statement {
  kind: NodeType;
}

/**@desc it's `AST` root node, represents whole program and contains all statements*/
interface AST_Program extends AST_Statement {
  kind: "Program";
  body: Statement[];
}

/**@desc returns value at run-time*/
interface AST_Expression extends AST_Statement {}

/**@desc represents numberic literal / fixed number*/
interface AST_NumericLiteral extends AST_Expression {
  kind: "NumericLiteral";
  value: number;
}

/**@desc consists of two `sides` (sides are expressions) seperated by `operator`*/
interface AST_BinaryExp extends AST_Expression {
  kind: "BinaryExp";
  left: Expression;
  right: Expression;
  operator: string;
}
