import { Request, Response, NextFunction } from 'express';
import { IUser } from './mongoose/User';

declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

declare module 'express-session' {
  interface SessionData extends IUser {}
}

export interface IReq<T = void> extends Request {
  body: T;
}

export interface IRes extends Response {}

export interface INext extends NextFunction {}
