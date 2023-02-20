// PACKAGES
import fs from "fs";
import path from "path";
import promptSync from "prompt-sync";
const prompt = promptSync();

// PROJECT MODULES
import { ErrorCode } from "./constants";
import { Err } from "./utils";
import { Lexer, Parser } from "./frontend";

// -----------------------------------------------
//                 INTERPRETER
// -----------------------------------------------

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
        this.execFile();
        break;
      }

      // INVALID interactionMethod
      default: {
        this.handleErr(
          new Err(
            `Internal interpreter error: invalid interactionMethod, value: ${this.interactionMethod}`,
            "internal"
          )
        );
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
          this.handleErr(new Err(`Invalid argument: '${arg}'`, "invalidArg"));
      }
    }
  }

  /**@desc REPL implementation*/
  private repl() {
    console.log("\nREPL");

    while (true) {
      const input = prompt("> ");
      const trimmedinput = input.trim();

      if (trimmedinput === "exit" || trimmedinput === "exit()") process.exit(1);

      try {
        const lexerOutput = new Lexer(input).tokenize();
        const AST = new Parser(lexerOutput).buildAST();

        // VERBOSE OUTPUT
        if (this.isVerbose) {
          this.outputLog("LEXER OUTPUT:", lexerOutput);
          this.outputLog("AST:", AST);
          this.printBreakLine();
        }
      } catch (err) {
        // custom err handling, because I don't want to exit process within REPL
        if (err instanceof Err) console.error(err.message);
        else console.error(err);
      }
    }
  }

  /**@desc execute supplied file*/
  private execFile() {
    try {
      if (!this.filePath) throw new Err("filepath hasn't been provided!", "missingArg");
      if (!fs.existsSync(this.filePath))
        throw new Err(`file: '${this.filePath}' was not found`, "invalidArg");

      const src = fs.readFileSync(this.filePath, { encoding: "utf-8" }).trimEnd();
      const lexerOutput = new Lexer(src).tokenize();
      const AST = new Parser(lexerOutput).buildAST();

      // VERBOSE OUTPUT
      if (this.isVerbose) {
        this.outputLog("SRC:", src);
        this.outputLog("LEXER OUTPUT:", lexerOutput);
        this.outputLog("AST:", AST);
        this.printBreakLine();
      }

      // HANDLE EXCEPTION
    } catch (err) {
      this.handleErr(err);
    }
  }

  /**@desc print interpreter manual*/
  private printManual(): void {
    const manual = fs.readFileSync(path.join(__dirname, "../manual"), { encoding: "utf-8" });

    console.log(manual);
    process.exit(0);
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc log `output` into std-output with break-lines included
  @param header header describing output / text preceding output
  @param output actual output / comes after header*/
  private outputLog(header: string, output: unknown): void {
    this.printBreakLine();
    console.log(header + "\n");
    console.log(JSON.stringify(output, null, 4));
  }

  /**@desc print break-line
  @param length length of break-line (default value: 100)*/
  private printBreakLine(length = 100): void {
    const breakChar = "-";
    console.log("\n" + breakChar.repeat(length));
  }

  /**@desc handle exceptions*/
  private handleErr(err: unknown): never {
    if (err instanceof Err) {
      console.error(err.message);
      process.exit(err.exitCode);
    } else {
      console.error(err);
      process.exit(ErrorCode.INTERNAL);
    }
  }
}

// RUN INTERPRETER
new Interpreter().run();
