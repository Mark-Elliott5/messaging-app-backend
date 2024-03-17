import WebSocket from 'ws';
import { IContentMessage, IOnlineUser } from './wsMessageTypes';

interface IDMRooms {
  [key: string]: {
    users: Map<string, IOnlineUser>;
    sockets: Set<WebSocket>;
    sender: IOnlineUser;
    receiver: IOnlineUser;
    messages: IContentMessage[];
  };
}

interface IRooms {
  [key: string]: {
    users: Map<string, IOnlineUser>;
    sockets: Set<WebSocket>;
    messages: IContentMessage[];
  };
}

type IAllSockets = Set<WebSocket>;

type IUsersOnlineMap = Map<string, IOnlineUser>;

export type { IAllSockets, IDMRooms, IRooms, IUsersOnlineMap };
