// PROJECT MODULES
import { ErrorCode } from "../constants";

type ErrCause = "internal" | "interpreter" | "missingArg" | "invalidArg";

/**@desc custom Error Constructor extended with `exitCode` property
@param errCause reason why exception was thrown / type of error (used for deriving `exitCode` property), default value: "interpreter"
@exitCode property representing exitCode associated with given `errCause`*/
export class Err extends Error {
  public exitCode: number;

  constructor(message: string, errCause: ErrCause = "interpreter") {
    super(message);

    switch (errCause) {
      case "interpreter": {
        this.exitCode = ErrorCode.INTERPRETATION;
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
