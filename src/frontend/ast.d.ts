// -----------------------------------------------
//                  AST TYPES
// -----------------------------------------------
// prefacing everything with AST because these are globally accessible, this way I'm avoiding confusion and possibility of name collisions

type AST_NodeKind =
  // STATEMENTS
  | "Program"
  | "VarDeclaration"
  | "BlockStmt"
  | "ReturnStmt"
  | "IfStmt"
  | "WhileStmt"
  | "ForStmt"
  | "DoWhileStmt"
  | "BreakStmt"
  | "ContinueStmt"
  | "FunctionDeclaration"
  | "ThrowStmt"
  | "TryCatchStmt"
  | "SwitchStmt"
  | "SwitchCaseStmt"

  // EXPRESSIONS
  | "AssignmentExpr"
  | "PrefixUnaryExpr"
  | "PostfixUnaryExpr"
  | "BinaryExpr"
  | "LogicalExpr"
  | "TernaryExpr"
  | "MemberExpr"
  | "CallExpr"
  | "FunctionExpr"

  // LITERALS
  | "NumericLiteral"
  | "StringLiteral"
  | "Identifier"
  | "ObjectProperty"
  | "ObjectLiteral"
  | "ArrayLiteral";

/**@desc represents `AST` node*/
type AST_Node = AST_Stmt | AST_Expr;

// -----------------------------------------------
//                  STATEMENTS
// -----------------------------------------------

interface AST_Stmt {
  kind: AST_NodeKind;
  start: CharPosition;
  end: CharPosition;
}

/**@desc it's `AST` root node, represents entirety of the program, and contains all nodes*/
interface AST_Program extends AST_Stmt {
  kind: "Program";
  body: AST_Node[];
}

interface AST_VarDeclaration extends AST_Stmt {
  kind: "VarDeclaration";
  identifier: string;
  operator?: string;
  value?: AST_Expr;
  constant: boolean;
}

interface AST_BlockStmt extends AST_Stmt {
  kind: "BlockStmt";
  body: AST_Node[];
}

interface AST_ReturnStmt extends AST_Stmt {
  kind: "ReturnStmt";
  argument?: AST_Expr;
}

interface AST_FunctionDeclaration extends AST_Stmt {
  kind: "FunctionDeclaration";
  name: string;
  parameters: AST_Identifier[];
  body: AST_BlockStmt;
}

interface AST_IfStmt extends AST_Stmt {
  kind: "IfStmt";
  test: AST_Expr;
  consequent: AST_Node;
  alternate?: AST_Node;
}

interface AST_WhileStmt extends AST_Stmt {
  kind: "WhileStmt";
  test: AST_Expr;
  body: AST_Node;
}

interface AST_DoWhileStmt extends AST_Stmt {
  kind: "DoWhileStmt";
  test: AST_Expr;
  body: AST_Node;
}

interface AST_ForStmt extends AST_Stmt {
  kind: "ForStmt";
  initializer?: AST_Node;
  test?: AST_Expr;
  update?: AST_Expr;
  body: AST_Node;
}

interface AST_BreakStmt extends AST_Stmt {
  kind: "BreakStmt";
}

interface AST_ContinueStmt extends AST_Stmt {
  kind: "ContinueStmt";
}

interface AST_ThrowStmt extends AST_Stmt {
  kind: "ThrowStmt";
  error: AST_Expr;
}

interface AST_TryCatchStmt extends AST_Stmt {
  kind: "TryCatchStmt";
  tryBlock: AST_BlockStmt;
  catchParam: AST_Identifier;
  catchBlock: AST_BlockStmt;
}

interface AST_SwitchStmt extends AST_Stmt {
  kind: "SwitchStmt";
  discriminant: AST_Expr;
  cases: AST_SwitchCaseStmt[];
}

interface AST_SwitchCaseStmt extends AST_Stmt {
  kind: "SwitchCaseStmt";
  test?: AST_Expr;
  consequent: AST_Node;
}

// -----------------------------------------------
//                 EXPRESSIONS
// -----------------------------------------------

interface AST_Expr extends AST_Stmt {}

interface AST_AssignmentExpr extends AST_Expr {
  kind: "AssignmentExpr";
  assigne: AST_Expr; // assigne could be a member-expression
  operator: string;
  value: AST_Expr;
}

interface AST_NumericLiteral extends AST_Expr {
  kind: "NumericLiteral";
  value: number;
}

interface AST_StringLiteral extends AST_Expr {
  kind: "StringLiteral";
  value: string;
}

interface AST_Identifier extends AST_Expr {
  kind: "Identifier";
  value: string;
}

interface AST_BinaryExpr extends AST_Expr {
  kind: "BinaryExpr";
  left: AST_Expr;
  right: AST_Expr;
  operator: string;
}

interface AST_LogicalExpr extends AST_Expr {
  kind: "LogicalExpr";
  left: AST_Expr;
  right: AST_Expr;
  operator: string;
}

interface AST_UnaryExpr extends AST_Expr {
  kind: "PrefixUnaryExpr" | "PostfixUnaryExpr";
  operator: string;
  operand: AST_Expr;
}

interface AST_PrefixUnaryExpr extends AST_UnaryExpr {
  kind: "PrefixUnaryExpr";
}

interface AST_PostfixUnaryExpr extends AST_UnaryExpr {
  kind: "PostfixUnaryExpr";
}

interface AST_TernaryExpr extends AST_Expr {
  kind: "TernaryExpr";
  test: AST_Expr;
  consequent: AST_Expr;
  alternate: AST_Expr;
}

interface AST_ObjectProperty extends AST_Expr {
  kind: "ObjectProperty";
  key: string;
  value?: AST_Expr;
}

interface AST_ObjectLiteral extends AST_Expr {
  kind: "ObjectLiteral";
  properties: AST_ObjectProperty[];
}

interface AST_ArrayLiteral extends AST_Expr {
  kind: "ArrayLiteral";
  elements: AST_Expr[];
}

interface AST_MemberExpr extends AST_Expr {
  kind: "MemberExpr";
  object: AST_Expr;
  property: AST_Expr;
  computed: boolean;
}

interface AST_CallExpr extends AST_Expr {
  kind: "CallExpr";
  arguments: AST_Expr[];
  callee: AST_Expr;
}

interface AST_FunctionExpr extends AST_Expr {
  kind: "FunctionExpr";
  name: null | string;
  parameters: AST_Identifier[];
  body: AST_BlockStmt;
}
