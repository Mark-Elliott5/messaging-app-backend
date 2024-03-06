import expressAsyncHandler from 'express-async-handler';
import { validationResult } from 'express-validator';
import { IGuessWaldo, IReq, IRes, ISubmitName } from '../types/types';
import { NextFunction } from 'express';

const asyncHandler = expressAsyncHandler;

type UserInput = IGuessWaldo | ISubmitName;

const validateBody = asyncHandler(
  async (req: IReq<UserInput>, res: IRes, next: NextFunction) => {
    const error = validationResult(req);

    if (!error.isEmpty()) {
      const errorArray = error.array().map((err) => err.msg);
      const errorString = errorArray.reduce(
        (accumulator, currentValue, currentIndex) =>
          accumulator + `${currentIndex + 1}. ${currentValue} `,
        ``
      );
      console.log(`Request failed validation: ` + errorString.slice(0, -1));
      throw new Error(`Request failed validation: ` + errorString.slice(0, -1));
    }
    next();
  }
);

export default validateBody;
