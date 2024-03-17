import WebSocket from 'ws';
import { IContentMessage, IOnlineUser } from './wsMessageTypes';

interface IDMRoom {
  users: Map<string, IOnlineUser>;
  sockets: Set<WebSocket>;
  sender: IOnlineUser;
  receiver: IOnlineUser;
  messages: IContentMessage[];
}

interface IDMRooms {
  [key: string]: IDMRoom;
}

interface IRoom {
  users: Map<string, IOnlineUser>;
  sockets: Set<WebSocket>;
  messages: IContentMessage[];
}

interface IRooms {
  [key: string]: IRoom;
}

type IAllSockets = Set<WebSocket>;

type IUsersOnlineMap = Map<string, IOnlineUser>;

export type { IAllSockets, IDMRoom, IDMRooms, IRoom, IRooms, IUsersOnlineMap };
