// PROJECT MODULES
import { ErrorCode } from "../constants";

type ErrCause = "internal" | "lexer" | "parser" | "interpreter" | "missingArg" | "invalidArg";

/**@desc custom Error Constructor extended with `exitCode` property
@param errCause reason why exception was thrown / type of error (used for deriving `exitCode` property)
@exitCode property representing exitCode associated with given `errCause`*/
export class Err extends Error {
  public exitCode: number;

  constructor(message: string, errCause: ErrCause) {
    super(message);

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

      case "missingArg": {
        this.exitCode = ErrorCode.MISSING_ARG;
        break;
      }

      case "invalidArg": {
        this.exitCode = ErrorCode.INVALID_ARG;
        break;
      }

      case "internal": {
        this.exitCode = ErrorCode.INTERNAL;
        break;
      }

      // if errCause for some reason isn't handled treat it as internal error
      default: {
        this.exitCode = ErrorCode.INTERNAL;
      }
    }
  }
}
