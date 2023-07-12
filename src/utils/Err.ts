// MODULES
import { ErrorCode } from "../constants";

type ErrCause = "internal" | "lexer" | "parser" | "interpreter" | "missingArg" | "invalidArg";

/**@desc custom Error Constructor extended with `exitCode` and `verboseMessage` properties
@param errCause reason why exception was thrown / type of error (used for deriving `exitCode` property)
@exitCode property representing exitCode associated with given `errCause`
@verboseMessage property is a `message` property preceded with `errCause`*/
export class Err extends Error {
  public exitCode: number;
  public verboseMessage: string;

  constructor(message: string, errCause: ErrCause) {
    super(message);

    this.verboseMessage = `${errCause.toUpperCase()}: ${this.message}`;

    switch (errCause) {
      case "lexer": {
        this.exitCode = ErrorCode.LEXER;
        break;
      }

      case "parser": {
        this.exitCode = ErrorCode.PARSER;
        break;
      }

      case "interpreter": {
        this.exitCode = ErrorCode.INTERPRETER;
        break;
      }

      case "internal": {
        this.exitCode = ErrorCode.INTERNAL;
        break;
      }

      case "missingArg": {
        this.exitCode = ErrorCode.MISSING_ARG;
        this.verboseMessage = `MISSING_ARG: ${message}`;
        break;
      }

      case "invalidArg": {
        this.exitCode = ErrorCode.INVALID_ARG;
        this.verboseMessage = `INVALID_ARG: ${message}`;
        break;
      }

      default: {
        // if errCause isn't handled for some reason, then treat it as internal error
        this.exitCode = ErrorCode.INTERNAL;
        this.verboseMessage = `UNHANDLED errCause: ${message}`;
      }
    }
  }
}
