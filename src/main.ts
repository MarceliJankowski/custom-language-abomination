// PACKAGES
import fs from "fs";
import path from "path";
import promptSync from "prompt-sync";
const prompt = promptSync();

// PROJECT MODULES
import { ErrorCode } from "./constants";
import { Err, parseForLogging, stringifyPretty, removePrototypeChainRecursively } from "./utils";
import { Lexer, Parser } from "./frontend";
import { Interpreter, createGlobalEnv, Runtime, RuntimeException, RuntimeAPIException } from "./backend";

// -----------------------------------------------
//                    TYPES
// -----------------------------------------------

interface EvaluateSrcOutput {
  lexer: ReturnType<typeof Lexer.prototype.tokenize>;
  parser?: ReturnType<typeof Parser.prototype.buildAST>;
  interpreter?: ReturnType<typeof Interpreter.prototype.evaluate>;
}

type EvaluateUpToType = "l" | "lexer" | "p" | "parser" | "i" | "interpreter";

// -----------------------------------------------
//             INTERPRETER INSTANCE
// -----------------------------------------------

export const interpreter = new Interpreter();

// -----------------------------------------------
//            INTERPRETER INTERFACE
// -----------------------------------------------

/**@desc embodiment of the interpreter / interface for interacting with it*/
class InterpreterInterface {
  private verboseMode = false;
  private ultraVerboseMode = false;
  private filePath: string | undefined;
  private evaluateUpTo: EvaluateUpToType = "interpreter";
  private globalEnv = createGlobalEnv(); // setup global variable environment

  /**@desc specifies which method of interacting with interpreter should be used*/
  private interactionMethod: undefined | "repl" | "file";

  /**@desc run interpreter!*/
  public run() {
    try {
      // PROCESS ARGUMENTS
      this.processArgs();

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
          throw new Err(
            `InteractionMethod was not provided, please checkout manual for more information`,
            "missingArg"
          );
        }
      }
    } catch (err) {
      this.handleErr(err);
    }
  }

  /**@desc process arguments passed to interpreter*/
  private processArgs() {
    const args = process.argv.slice(2); // actual arguments passed to interpreter

    /**@desc parsed arguments array
    @original [-vf, fileName, -e, parser]
    @parsed [-v, -f, fileName, -e, parser]*/
    const parsedArgs: string[] = [];

    // BUILD parsedArgs
    args.forEach(arg => {
      // FLAG SEGMENT
      if (arg.startsWith("-")) {
        const flagSegment = arg.slice(1); // turn '-rwx' into 'rwx' (one flagSegment can contain multiple flags)
        const flagComponents = flagSegment.split(""); // split 'rwx' into ['r', 'w', 'x']
        const individualFlags = flagComponents.map(flag => "-" + flag); // precede each flag with '-' to distinguish them from arguments

        parsedArgs.push(...individualFlags);
      }

      // ARGUMENT
      else parsedArgs.push(arg);
    });

    // if there are no parsedArgs print manual
    parsedArgs.length === 0 && this.printManual();

    // PROCESS ARGUMENTS
    while (parsedArgs.length > 0) {
      const arg = parsedArgs.shift();

      switch (arg) {
        case "-h": {
          this.printManual();
          break;
        }

        case "-v": {
          if (this.verboseMode === true) this.ultraVerboseMode = true;
          else this.verboseMode = true;

          break;
        }

        case "-r": {
          if (this.interactionMethod === "file")
            throw new Err(
              "Invalid arguments. Flags: '-r' and '-f' are present, this is invalid because these flags exclude each other (please checkout manual for more information)",
              "invalidArg"
            );

          this.interactionMethod = "repl";
          break;
        }

        case "-f": {
          if (this.interactionMethod === "repl")
            throw new Err(
              "Invalid arguments. Flags: '-r' and '-f' are present, this is invalid because these flags exclude each other (please checkout manual for more information)",
              "invalidArg"
            );

          this.interactionMethod = "file";
          this.filePath = parsedArgs.shift();
          break;
        }

        case "-e": {
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
      let input = prompt("> ");

      // handling SIGINT (Ctr-C) signal
      if (input === null) {
        console.log("Exiting REPL");
        process.exit(0);
      }

      const trimmedInput = input.trim();

      // REPL COMMANDS
      if (trimmedInput === "exit") process.exit(0);
      if (trimmedInput === "clear") {
        console.clear();
        continue;
      }

      try {
        const output = this.evaluateSrc(input);

        // LOG OUTPUT
        if (this.verboseMode) this.verboseOutput(input, output);
        else this.log(output.interpreter!);

        // HANDLE EXCEPTION (directly inside while loop to prevent breaking-out of it)
      } catch (err) {
        this.handleErr(err);
      }
    }
  }

  /**@desc execute supplied file*/
  private execFile() {
    if (!this.filePath) throw new Err("Filepath hasn't been provided!", "missingArg");
    if (!fs.existsSync(this.filePath)) throw new Err(`File: '${this.filePath}' was not found`, "invalidArg");

    const src = fs.readFileSync(this.filePath, { encoding: "utf-8" }).trimEnd();
    const output = this.evaluateSrc(src);

    // LOG OUTPUT
    if (this.verboseMode) this.verboseOutput(src, output);
  }

  /**@desc print interpreter manual*/
  private printManual(): void {
    const manual = fs.readFileSync(path.join(__dirname, "../manual"), { encoding: "utf-8" });

    console.log(manual);
    process.exit(0);
  }

  /**@desc interpret/evaluate `src` param
  @return object with outputs of each interpreter stage (impacted by `evaluateUpTo` option)*/
  private evaluateSrc(src: string): EvaluateSrcOutput {
    const lexerOutput = new Lexer(src).tokenize();

    let parserOutput: AST_Program | undefined;
    let interpreterOutput: Runtime.Value | undefined;

    // HANDLE evaluateUpTo OPTION
    if (this.evaluateUpTo === "parser" || this.evaluateUpTo === "interpreter") {
      parserOutput = new Parser([...lexerOutput]).buildAST(); // passing shallow-copy of lexerOutput because parser modifies it and I need original for the verboseOutput

      if (this.evaluateUpTo === "interpreter")
        interpreterOutput = interpreter.evaluate(parserOutput, this.globalEnv);
    }

    return {
      lexer: lexerOutput,
      parser: parserOutput,
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

  /**@desc log input in a `non-verbose` way*/
  private log(input: Runtime.Value): void {
    const output = parseForLogging(input);

    console.log(output);
  }

  /**@desc output verbose information (impacted by: `evaluateUpTo` and `ultraVerboseMode` options)*/
  private verboseOutput(src: string, output: EvaluateSrcOutput): void {
    this.printBreakLine();
    console.log("SRC:\n\n" + src);
    this.outputLog("LEXER OUTPUT:", output.lexer, "lexer");

    // HANDLE 'evaluateUpTo' OPTION
    if (this.evaluateUpTo === "parser" || this.evaluateUpTo === "interpreter") {
      this.outputLog("PARSER OUTPUT:", output.parser, "parser");

      if (this.evaluateUpTo === "interpreter") {
        let interpreterOutput = output.interpreter!;

        // HANDLE 'ultraVerboseMode' OPTION
        if (this.ultraVerboseMode === false)
          interpreterOutput = removePrototypeChainRecursively(interpreterOutput);

        this.outputLog("INTERPRETER OUTPUT:", interpreterOutput, "interpreter");
      }
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

    if (outputSrc === "lexer") stringifyMaxLength = 45; // decrease length to prevent wrapping (lexer tokens are shorter, hence they get line-wrapped more often)

    const prettyOutput = stringifyPretty(output, { indent: 4, maxLength: stringifyMaxLength });

    console.log(prettyOutput);
  }

  /**@desc print break-line
  @param length length of break-line (default value: 100)*/
  private printBreakLine(length = 100): void {
    const breakChar = "-";
    console.log("\n" + breakChar.repeat(length));
  }

  /**@desc handle exceptions (doesn't terminate process in REPL)*/
  private handleErr(err: unknown): void | never {
    let exitCode: number;
    let errorOutput: unknown;

    // handle exceptions purposefully raised by interpreter
    if (err instanceof Err) {
      errorOutput = this.verboseMode ? err.verboseMessage : err.message;
      exitCode = err.exitCode;
    }

    // handle RuntimeExceptions (thrown within the input program)
    else if (err instanceof RuntimeException) {
      exitCode = 6; // from manual
      errorOutput = `Uncaught runtime exception:\nat position: ${err.position}\ntype: ${err.value.type}\nvalue: ${err.value.value}`;
    }

    // handle RuntimeAPIExceptions (thrown by CLA API (native/static functions))
    else if (err instanceof RuntimeAPIException) {
      exitCode = 7; // from manual
      errorOutput = `Uncaught runtime API exception:\nat position: ${err.position}\nthrown by: ${err.thrownBy}\nmessage: ${err.message}`;
    }

    // handle unexpected internal errors
    else {
      errorOutput = err;
      exitCode = ErrorCode.INTERNAL;
    }

    console.error(errorOutput);
    if (this.interactionMethod !== "repl") process.exit(exitCode);
  }
}

// RUN INTERPRETER
new InterpreterInterface().run();
