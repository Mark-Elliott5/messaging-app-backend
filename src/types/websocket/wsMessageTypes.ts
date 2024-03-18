import { Types } from 'mongoose';
import WebSocket from 'ws';

// responses

interface IResponseUser {
  username: string;
  avatar: number;
  bio: string;
}

interface IOnlineUser extends IResponseUser {
  ws: WebSocket;
  _id: Types.ObjectId;
  guest: boolean;
}

interface IContentMessage {
  type: 'message';
  content: string;
  user: IResponseUser | Types.ObjectId;
  date: Date; // will be stringified on frontend
  guest: boolean;
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
  messageHistory: IContentMessage[];
}

interface IProfileMessage {
  type: 'profile';
  profile: IResponseUser;
}

export type {
  IResponseUser,
  IOnlineUser,
  IContentMessage,
  IDMTabMessage,
  ITypingMessage,
  IBlockedMessage,
  IJoinRoomMessage,
  IRoomUsersMessage,
  IUsersOnlineMessage,
  IMessageHistoryMessage,
  IProfileMessage,
};
