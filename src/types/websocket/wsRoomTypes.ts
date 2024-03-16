import WebSocket from 'ws';
import { IMessageModel } from '../mongoose/Messages';
import { IOnlineUser } from './wsMessageTypes';

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

type IAllSockets = Set<WebSocket>;

type IUsersOnlineMap = Map<string, IOnlineUser>;

export type { IAllSockets, IDMRooms, IRooms, IUsersOnlineMap };
