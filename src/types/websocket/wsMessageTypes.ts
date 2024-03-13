import { Types } from 'mongoose';
import WebSocket from 'ws';

interface IMessage {
  type: 'message';
  content: string;
  user: {
    username: string;
    avatar: number;
  };
  date: Date; // will be stringified on frontend
}

interface IDMTab {
  type: 'dmTab';
  sender: {
    username: string;
    avatar: number;
  };
  room: string;
}

interface IUser {
  username: string;
  avatar: number;
  bio: string;
  ws: WebSocket;
}

interface ITyping {
  type: 'typing';
  typing: boolean;
  user: {
    username: string;
    avatar: number;
  };
}

interface IBlocked {
  type: 'blocked';
  message: string;
}

interface IJoinRoom {
  type: string;
  users: string[];
}

interface IUsersOnline {
  type: string;
  usersOnline: string[];
}

export type {
  ITyping,
  IBlocked,
  IJoinRoom,
  IUsersOnline,
  IMessage,
  IDMTab,
  IUser,
};
