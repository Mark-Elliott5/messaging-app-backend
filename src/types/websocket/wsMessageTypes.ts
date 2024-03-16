import { IMessageModel } from '../mongoose/Messages';
import WebSocket from 'ws';

// responses

interface IResponseUser {
  username: string;
  avatar: number;
  bio: string;
}

interface IOnlineUser extends IResponseUser {
  ws: WebSocket;
}

interface IMessageMessage {
  type: 'message';
  content: string;
  user: IResponseUser;
  date: Date; // will be stringified on frontend
}

interface IDMTabMessage {
  type: 'dmTab';
  sender: IResponseUser;
  room: string;
}

interface ITypingMessage {
  type: 'typing';
  typing: boolean;
  user: IResponseUser;
}

interface IBlockedMessage {
  type: 'blocked';
  message: string;
}

interface IJoinRoomMessage {
  type: 'joinRoom';
  room: string;
}

interface IRoomUsersMessage {
  type: 'roomUsers';
  roomUsers: IResponseUser[]; // sets cannot be stringified, so must be array
}

interface IUsersOnlineMessage {
  type: 'usersOnline';
  usersOnline: IResponseUser[]; // sets cannot be stringified, so must be array
}

interface IMessageHistoryMessage {
  type: 'messageHistory';
  messageHistory: IMessageModel[];
}

export type {
  IResponseUser,
  IOnlineUser,
  IMessageMessage,
  IDMTabMessage,
  ITypingMessage,
  IBlockedMessage,
  IJoinRoomMessage,
  IRoomUsersMessage,
  IUsersOnlineMessage,
  IMessageHistoryMessage,
};
