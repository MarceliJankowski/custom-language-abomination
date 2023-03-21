// -----------------------------------------------
//                  AST TYPES
// -----------------------------------------------
// prefacing everything with AST because these are globally accessible, this way I'm avoiding confusion and possibility of name collisions

type AST_Node =
  // STATEMENTS
  | "Program"
  | "VarDeclaration"
  | "BlockStatement"
  | "FunctionDeclaration"
  | "ReturnStatement"
  | "IfStatement"
  | "WhileStatement"
  | "BreakStatement"

  // EXPRESSIONS
  | "AssignmentExp"
  | "PrefixUnaryExp"
  | "PostfixUnaryExp"
  | "BinaryExp"
  | "TernaryExp"
  | "MemberExp"
  | "CallExp"

  // LITERALS
  | "NumericLiteral"
  | "StringLiteral"
  | "Identifier"
  | "ObjectProperty"
  | "ObjectLiteral"
  | "ArrayLiteral";

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
  operator?: string;
  value?: AST_Expression;
  constant: boolean;
}

interface AST_BlockStatement extends AST_Statement {
  kind: "BlockStatement";
  body: AST_Statement[];
}

interface AST_ReturnStatement extends AST_Statement {
  kind: "ReturnStatement";
  argument?: AST_Statement;
}

interface AST_FunctionDeclaration extends AST_Statement {
  kind: "FunctionDeclaration";
  name: string;
  parameters: AST_Identifier[];
  body: AST_BlockStatement;
}

interface AST_IfStatement extends AST_Statement {
  kind: "IfStatement";
  test: AST_Expression;
  consequent: AST_Statement;
  alternate?: AST_Statement;
}

interface AST_WhileStatement extends AST_Statement {
  kind: "WhileStatement";
  test: AST_Expression;
  body: AST_Statement;
}

interface AST_BreakStatement extends AST_Statement {
  kind: "BreakStatement";
}

/**@desc returns value at run-time*/
interface AST_Expression extends AST_Statement {}

// -----------------------------------------------
//              EXTENDS EXPRESSION
// -----------------------------------------------

interface AST_AssignmentExp extends AST_Expression {
  kind: "AssignmentExp";
  assigne: AST_Expression; // assigne is an expression because I want to support member-expressions (like: obj.a = 'value', where 'obj.a' is a member-expression)
  operator: string;
  value: AST_Expression;
}

interface AST_NumericLiteral extends AST_Expression {
  kind: "NumericLiteral";
  value: number;
}

interface AST_StringLiteral extends AST_Expression {
  kind: "StringLiteral";
  value: string;
}

interface AST_Identifier extends AST_Expression {
  kind: "Identifier";
  value: string;
}

/**@desc consists of two `sides` (sides are expressions) seperated by `operator`*/
interface AST_BinaryExp extends AST_Expression {
  kind: "BinaryExp";
  left: AST_Expression;
  right: AST_Expression;
  operator: string;
}

/**@desc consists of `operand` (part manipulated/affected by the operator) and `operator` (character representing specific action)*/
interface AST_UnaryExp extends AST_Expression {
  kind: "PrefixUnaryExp" | "PostfixUnaryExp";
  operator: string;
  operand: AST_Expression;
}

/**@desc `operator` comes first and then `operand` (like that: ++var)*/
interface AST_PrefixUnaryExp extends AST_UnaryExp {
  kind: "PrefixUnaryExp";
}

/**@desc `operand` comes first and then `operator` (like that: var++)*/
interface AST_PostfixUnaryExp extends AST_UnaryExp {
  kind: "PostfixUnaryExp";
}

interface AST_TernaryExp extends AST_Expression {
  kind: "TernaryExp";
  test: AST_Expression;
  consequent: AST_Expression;
  alternate: AST_Expression;
}

/**@desc represents `object` property*/
interface AST_ObjectProperty extends AST_Expression {
  kind: "ObjectProperty";
  key: string;
  value?: AST_Expression;
}

interface AST_ObjectLiteral extends AST_Expression {
  kind: "ObjectLiteral";
  properties: AST_ObjectProperty[];
}

interface AST_ArrayLiteral extends AST_Expression {
  kind: "ArrayLiteral";
  elements: AST_Expression[];
}

/**@desc represents object/property relationship, used for accessing object properties (for instance: `obj.property`)
@computed determines whether it's a computed member-expression (like: `obj["key"]`)*/
interface AST_MemberExp extends AST_Expression {
  kind: "MemberExp";
  object: AST_Expression;
  property: AST_Expression;
  computed: boolean;
}

interface AST_CallExp extends AST_Expression {
  kind: "CallExp";
  arguments: AST_Expression[];
  callee: AST_Expression;
}
