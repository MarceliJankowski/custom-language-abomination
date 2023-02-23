// -----------------------------------------------
//                  AST TYPES
// -----------------------------------------------
// prefacing everything with AST because these are globally accessible, this way I'm avoiding confusion and possibility of name collisions

type AST_Node =
  // STATEMENTS
  | "Program"
  | "VarDeclaration"

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

// -----------------------------------------------
//              EXTENDS STATEMENT
// -----------------------------------------------

/**@desc it's `AST` root node, represents whole program and contains all statements*/
interface AST_Program extends AST_Statement {
  kind: "Program";
  body: AST_Statement[];
}

interface AST_VarDeclaration extends AST_Statement {
  kind: "VarDeclaration";
  identifier: string;
  value?: AST_Expression;
  constant: boolean;
}

/**@desc returns value at run-time*/
interface AST_Expression extends AST_Statement {}

// -----------------------------------------------
//              EXTENDS EXPRESSION
// -----------------------------------------------

interface AST_NumericLiteral extends AST_Expression {
  kind: "NumericLiteral";
  value: number;
}

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
