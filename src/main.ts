// PACKAGES
import fs from "fs";
import path from "path";
import stringify from "json-stringify-pretty-compact";
import promptSync from "prompt-sync";
const prompt = promptSync();

// PROJECT MODULES
import { ErrorCode } from "./constants";
import { Err } from "./utils";
import { Lexer, Parser } from "./frontend";
import { Interpreter, createGlobalEnv } from "./backend";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------
// here because I can't define them within Class

interface EvaluateSrcOutput {
  lexer: ReturnType<typeof Lexer.prototype.tokenize>;
  parser?: ReturnType<typeof Parser.prototype.buildAST>;
  interpreter?: ReturnType<typeof Interpreter.prototype.evaluate>;
}

type EvaluateUpToType = "l" | "lexer" | "p" | "parser" | "i" | "interpreter";

// -----------------------------------------------
//            INTERPRETER INTERFACE
// -----------------------------------------------

/**@desc embodiment of the interpreter / interface for interacting with it*/
class InterpreterInterface {
  private verboseMode = false;
  private filePath: string | undefined;
  private evaluateUpTo: EvaluateUpToType = "interpreter";
  private globalEnv = createGlobalEnv(); // setup global variable environment

  /**@desc specifies which method of interacting with interpreter should be used*/
  private interactionMethod: undefined | "repl" | "file";

  /**@desc run interpreter!*/
  public run() {
    // PROCESS ARGUMENTS
    try {
      this.processArgs();
    } catch (err) {
      this.handleErr(err);
    }

    // RUN INTERPRETER BASED ON 'interactionMethod'
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
            `InteractionMethod was not provided, please checkout manual for more information`,
            "missingArg"
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
          this.verboseMode = true;
          break;
        }

        case "r": {
          if (this.interactionMethod === "file")
            throw new Err(
              "Invalid arguments. Flags: 'r' and 'f' are present, this is invalid because these flags exclude each other (please checkout manual for more information)",
              "invalidArg"
            );

          this.interactionMethod = "repl";
          break;
        }

        case "f": {
          if (this.interactionMethod === "repl")
            throw new Err(
              "Invalid arguments. Flags: 'r' and 'f' are present, this is invalid because these flags exclude each other (please checkout manual for more information)",
              "invalidArg"
            );

          this.interactionMethod = "file";
          this.filePath = parsedArgs.shift();
          break;
        }

        case "e": {
          const arg = parsedArgs.shift();

          // CHECK 'arg' VALIDITY
          if (arg === undefined) throw new Err("Missing argument following: '-e' flag", "invalidArg");
          if (!this.isEvaluateUpToArgValid(arg))
            throw new Err(
              `Invalid '-e' flag argument: '${arg}', please checkout manual for more information`,
              "invalidArg"
            );

          // automatically turn on verbose-mode
          this.verboseMode = true;

          let evaluateUpToValue: EvaluateUpToType = arg as EvaluateUpToType;

          // PARSE SHORTCUTS

          // lexer
          if (arg === "l") evaluateUpToValue = "lexer";
          // parser
          else if (arg === "p") evaluateUpToValue = "parser";
          // interpreter
          else if (arg === "i") evaluateUpToValue = "interpreter";

          // HANDLE evaluateUpTo
          this.evaluateUpTo = evaluateUpToValue;
          break;
        }

        default:
          throw new Err(`Invalid argument: '${arg}'`, "invalidArg");
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
        const output = this.evaluateSrc(input);

        // LOG OUTPUT
        if (this.verboseMode) this.verboseOutput(input, output);
        else console.log(output.interpreter!.value);

        // HANDLE EXCEPTION
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
      if (!this.filePath) throw new Err("Filepath hasn't been provided!", "missingArg");
      if (!fs.existsSync(this.filePath))
        throw new Err(`File: '${this.filePath}' was not found`, "invalidArg");

      const src = fs.readFileSync(this.filePath, { encoding: "utf-8" }).trimEnd();
      const output = this.evaluateSrc(src);

      // LOG OUTPUT
      if (this.verboseMode) this.verboseOutput(src, output);
      else console.log(output.interpreter!.value);

      // HANDLE EXCEPTION
    } catch (err) {
      this.handleErr(err);
    }
  }

  /**@desc print interpreter manual*/
  private printManual(): void {
    const manual = fs.readFileSync(path.join(process.cwd(), "./manual"), { encoding: "utf-8" });

    console.log(manual);
    process.exit(0);
  }

  /**@desc interpret/evaluate `src` param
  @return object with outputs of each interpreter stage (impacted by `evaluateUpTo` option)*/
  private evaluateSrc(src: string): EvaluateSrcOutput {
    const lexerOutput = new Lexer(src).tokenize();

    let AST: AST_Program | undefined;
    let interpreterOutput: Runtime_Value | undefined;

    // HANDLE evaluateUpTo OPTION
    if (this.evaluateUpTo === "parser" || this.evaluateUpTo === "interpreter") {
      AST = new Parser([...lexerOutput]).buildAST(); // passing shallow-copy of lexerOutput because parser modifies it and I need original for the verboseOutput

      if (this.evaluateUpTo === "interpreter")
        interpreterOutput = new Interpreter(this.globalEnv).evaluate(AST);
    }

    return {
      lexer: lexerOutput,
      parser: AST,
      interpreter: interpreterOutput,
    };
  }

  // -----------------------------------------------
  //                  UTILITIES
  // -----------------------------------------------

  /**@desc determine whether `arg` is valid evaluateUpTo value*/
  private isEvaluateUpToArgValid(arg: unknown): boolean {
    const validEvaluateUpToValues: EvaluateUpToType[] = ["l", "lexer", "p", "parser", "i", "interpreter"];
    const isValid = validEvaluateUpToValues.some(validValue => validValue === arg);

    return isValid;
  }

  /**@desc output verbose information (impacted by `evaluateUpTo` option)*/
  private verboseOutput(src: string, output: EvaluateSrcOutput): void {
    this.printBreakLine();
    console.log("SRC:\n\n" + src);
    this.outputLog("LEXER OUTPUT:", output.lexer, "lexer");

    // HANDLE evaluateUpTo OPTION
    if (this.evaluateUpTo === "parser" || this.evaluateUpTo === "interpreter") {
      this.outputLog("PARSER OUTPUT:", output.parser, "parser");

      if (this.evaluateUpTo === "interpreter")
        this.outputLog("INTERPRETER OUTPUT:", output.interpreter, "interpreter");
    }

    this.printBreakLine();
  }

  /**@desc log `output` into std-output with break-lines included
  @param header header describing output / text preceding output
  @param output actual output / comes after header
  @param outputSrc represents src of the output. Used for setting stringify `maxLength` option (allows for custom line-wrapping based on `src`)*/
  private outputLog(header: string, output: unknown, outputSrc: "lexer" | "parser" | "interpreter"): void {
    this.printBreakLine();
    console.log(header + "\n");

    let stringifyMaxLength = 60; // default value

    if (outputSrc === "lexer") stringifyMaxLength = 45; // decrease length to prevent wrapping (lexer tokens are shorter, hence they get line-wrapped more easilly)

    console.log(stringify(output, { indent: 4, maxLength: stringifyMaxLength }));
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
new InterpreterInterface().run();
