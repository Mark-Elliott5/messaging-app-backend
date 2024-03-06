import { Request, Response, NextFunction } from 'express';
import { IWaldo } from './mongoose/Waldo';

export interface ISessionWaldo {
  [k: string]: IWaldo & { found: boolean };
}

declare module 'express-session' {
  interface SessionData {
    startDate: Date | undefined;
    endDate: Date | undefined;
    win: boolean;
    waldos: ISessionWaldo | undefined;
    correctCount: number;
  }
}

export interface IGuessWaldo {
  coords: { x: number; y: number };
  waldo: string;
}

export interface ISubmitName {
  name: string;
}

export interface IReq<T = void> extends Request {
  body: T;
}

export interface IRes extends Response {}

export interface INext extends NextFunction {}
