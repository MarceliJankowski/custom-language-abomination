import Lexer from "./frontend/lexer";

const input = "\n1\t\r 2";

const tokens = new Lexer(input).tokenize();

console.log(tokens);
