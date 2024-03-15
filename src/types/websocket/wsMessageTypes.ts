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

interface IMessage {
  type: 'message';
  content: string;
  user: IResponseUser;
  date: Date; // will be stringified on frontend
}

interface IDMTab {
  type: 'dmTab';
  sender: IResponseUser;
  room: string;
}

interface ITyping {
  type: 'typing';
  typing: boolean;
  user: IResponseUser;
}

interface IBlocked {
  type: 'blocked';
  message: string;
}

interface IJoinRoom {
  type: 'joinRoom';
  room: string;
}

interface IRoomUsers {
  type: 'roomUsers';
  roomUsers: IResponseUser[]; // sets cannot be stringified, so must be array
}

interface IUsersOnline {
  type: 'usersOnline';
  usersOnline: IResponseUser[]; // sets cannot be stringified, so must be array
}

interface IMessageHistory {
  type: 'messageHistory';
  messageHistory: IMessageModel[];
}

// room types

interface IDMRooms {
  [key: string]: {
    users: Map<string, IOnlineUser>;
    sockets: Set<WebSocket>;
    sender: IOnlineUser;
    receiver: IOnlineUser;
    messages: IMessageModel[];
  };
}

interface IRooms {
  [key: string]: {
    users: Map<string, IOnlineUser>;
    sockets: Set<WebSocket>;
    messages: IMessageModel[];
  };
}

export type {
  ITyping,
  IBlocked,
  IJoinRoom,
  IOnlineUser,
  IMessage,
  IDMTab,
  IRooms,
  IDMRooms,
  IRoomUsers,
  IMessageHistory,
  IResponseUser,
  IUsersOnline,
};
