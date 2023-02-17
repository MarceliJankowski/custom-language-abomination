// PACKAGES
import fs from "fs";
import promptSync from "prompt-sync";
const prompt = promptSync();

// PROJECT MODULES
import Lexer from "./frontend/lexer";

run(); // run interpreter

/**@desc run interpreter!*/
function run() {
  const args = process.argv.slice(2);
  const flag = args[0];

  switch (flag) {
    case "-r": {
      REPL();
      break;
    }

    case "-f": {
      const filePath = args[1];

      try {
        execFile(filePath);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }

      break;
    }

    default:
      console.error(`Unknown flag: '${flag}'`);
      process.exit(2);
  }
}

/**@desc REPL implementation*/
function REPL() {
  console.log("\nREPL");

  while (true) {
    const input = prompt("> ");

    if (input === "exit" || input === "exit()") process.exit(1);

    try {
      const lexerOutput = new Lexer(input).tokenize();

      console.log("LEXER OUTPUT:\n", lexerOutput);
    } catch (err) {
      console.error(err);
    }
  }
}

/**@desc execute file supplied  */
function execFile(filePath: string) {
  if (!filePath) throw "filepath hasn't been provided!";
  if (!fs.existsSync(filePath)) throw `file: '${filePath}' was not found`;

  const src = fs.readFileSync(filePath, { encoding: "utf-8" });

  console.log("SRC:\n" + src);

  const lexerOutput = new Lexer(src).tokenize();

  console.log("LEXER OUTPUT:", lexerOutput);
}
