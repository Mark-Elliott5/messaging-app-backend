import { Types } from 'mongoose';

interface IMessage {
  type: 'message';
  content: string;
  user: {
    username: string;
    avatar: number;
  };
  date: string; // strigified, needs to be reconstructed with new Date(x)
}

interface IDMTab {
  type: 'dmTab';
  sender: {
    username: string;
    avatar: number;
  };
  room: string;
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

interface IUser {
  _id: Types.ObjectId;
  username: string;
  bio: string;
  avatar: number;
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
