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

export interface ISendMessage {
  action: 'submitMessage';
  content: string; // FormDataEntryValue
  // need to add current channel property inherited from App.tsx
}

export interface ITypingIndication {
  action: 'typing';
  typing: boolean;
}

export interface IJoinRoom {
  action: 'joinRoom';
  room: string;
}

export type UserAction = ISendMessage | ITypingIndication | IJoinRoom;

export interface IReq<T = void> extends Request {
  body: T;
}

export interface IRes extends Response {}

export interface INext extends NextFunction {}
