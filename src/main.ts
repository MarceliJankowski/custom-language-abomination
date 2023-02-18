// PACKAGES
import fs from "fs";
import path from "path";
import promptSync from "prompt-sync";
const prompt = promptSync();

// PROJECT MODULES
import Lexer from "./frontend/lexer";

/**@desc embodiment of the interpreter / interface for interacting with it*/
class Interpreter {
  private isVerbose = false;
  private filePath: string | undefined;

  /**@desc specifies which method of interacting with interpreter should be used*/
  private interactionMethod: undefined | "repl" | "file";

  /**@desc run interpreter!*/
  public run() {
    this.processArgs();

    switch (this.interactionMethod) {
      // REPL
      case "repl": {
        this.repl();
        break;
      }

      // FILE EXECUTION
      case "file": {
        try {
          this.execFile();
        } catch (err) {
          console.error(err);
          process.exit(1);
        }

        break;
      }

      // INVALID interactionMethod
      default: {
        console.error(
          `Internal interpreter error: invalid interactionMethod, value: ${this.interactionMethod}`
        );
        process.exit(255);
      }
    }
  }

  /**@desc process arguments passed to interpreter*/
  private processArgs() {
    const args = process.argv.slice(2); // actual arguments passed to interpreter

    /**@desc parsed arguments array
    @original [-vf, fileName -x]
    @parsed [v, f, fileName, x]*/
    const parsedArgs: string[] = [];

    // build parsedArgs
    args.forEach(arg => {
      if (arg.startsWith("-")) {
        const flagComponents = arg.slice(1).split("");
        parsedArgs.push(...flagComponents);
      } else {
        parsedArgs.push(arg);
      }
    });

    // if there are no parsedArgs print manual
    parsedArgs.length === 0 && this.printManual();

    // PROCESS ARGUMENTS
    while (parsedArgs.length > 0) {
      const arg = parsedArgs.shift();

      switch (arg) {
        case "h": {
          this.printManual();
          break;
        }

        case "v": {
          this.isVerbose = true;
          break;
        }

        case "r": {
          this.interactionMethod = "repl";
          break;
        }

        case "f": {
          this.interactionMethod = "file";
          this.filePath = parsedArgs.shift();
          break;
        }

        default:
          console.error(`Unknown arg: '${arg}'`);
          process.exit(2);
      }
    }
  }

  /**@desc REPL implementation*/
  private repl() {
    console.log("\nREPL");

    while (true) {
      const input = prompt("> ");

      if (input === "exit" || input === "exit()") process.exit(1);

      try {
        const lexerOutput = new Lexer(input).tokenize();

        // VERBOSE OUTPUT
        if (this.isVerbose) {
          this.outputLog("LEXER OUTPUT:", lexerOutput);
          this.printBreakLine();
        }
      } catch (err) {
        console.error(err);
      }
    }
  }

  /**@desc execute supplied file*/
  private execFile() {
    if (!this.filePath) throw "filepath hasn't been provided!";
    if (!fs.existsSync(this.filePath)) throw `file: '${this.filePath}' was not found`;

    const src = fs.readFileSync(this.filePath, { encoding: "utf-8" }).trimEnd();
    const lexerOutput = new Lexer(src).tokenize();

    // VERBOSE OUTPUT
    if (this.isVerbose) {
      this.outputLog("SRC:", src);
      this.outputLog("LEXER OUTPUT:", lexerOutput);
      this.printBreakLine();
    }
  }

  /**@desc print interpreter manual*/
  private printManual(): void {
    const manual = fs.readFileSync(path.join(__dirname, "../manual"), { encoding: "utf-8" });
    console.log(manual);

    process.exit(0);
  }

  /**@desc log `output` into std-output with break-lines included
  @param header header describing output / text preceding output
  @param output actual output / comes after header*/
  private outputLog(header: string, output: unknown): void {
    this.printBreakLine();
    console.log(header + "\n");
    console.log(output);
  }

  /**@desc print break-line
  @param length length of break-line (default value: 100)*/
  private printBreakLine(length = 100): void {
    const breakChar = "-";
    console.log("\n" + breakChar.repeat(length));
  }
}

// RUN INTERPRETER
new Interpreter().run();
