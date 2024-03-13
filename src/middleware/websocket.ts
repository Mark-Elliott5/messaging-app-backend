import WebSocket from 'ws';
import { IReq } from '../types/express';
import { UserAction } from '../types/websocket/wsActionTypes';

const allSockets: Set<WebSocket> = new Set();

const rooms: {
  [key: string]: {
    users: string[];
    sockets: Set<WebSocket>;
  };
} = {};

const usersOnline: Map<
  string,
  {
    username: string;
    avatar: number;
    bio: string;
  }
> = new Map();

function websocketHandler(ws: WebSocket, req: IReq) {
  if (!req.user) {
    blockAction(ws, 'Connect');
    return;
  }

  let roomId = 'general';

  allSockets.add(ws);

  usersOnline.set(req.user.username, {
    username: req.user.username,
    avatar: req.user.avatar,
    bio: req.user.bio,
  });

  joinRoom(ws, req.user, roomId);
  ws.send(
    JSON.stringify({
      type: 'usersOnline',
      users: Array.from(usersOnline.values()),
    })
  );

  ws.on('message', (msg: WebSocket.RawData) => {
    if (!req.user) {
      return;
    }
    const data: UserAction = JSON.parse(msg.toString());
    console.log(data);
    const { action } = data;
    if (action === 'submitMessage') {
      console.log('submitMessage');
      sendMessage(req.user, data.content, roomId);
    }
    if (action === 'joinRoom') {
      console.log('joinRoom');
      sendTyping(req.user, false, roomId);
      removeFromRoom(ws, roomId);
      roomId = data.room;
      joinRoom(ws, req.user, roomId);
    }
    if (action === 'typing') {
      console.log('typing');
      sendTyping(req.user, data.typing, roomId);
    }
  });

  ws.on('close', () => {
    if (!req.user) {
      return;
    }
    sendTyping(req.user, false, roomId);
    usersOnline.delete(req.user.username);
    allSockets.forEach((ws) => {
      ws.send(
        JSON.stringify({
          type: 'usersOnline',
          usersOnline: Array.from(usersOnline.values()),
        })
      );
    });
    removeFromRoom(ws, roomId);
    allSockets.delete(ws);
  });
}

function sendTyping(user: Express.User, typing: boolean, room: string) {
  const { username, avatar } = user;
  const response = JSON.stringify({
    type: 'typing',
    typing,
    user: { username, avatar },
  });
  try {
    rooms[room].sockets.forEach((ws) => {
      ws.send(response);
    });
  } catch (error) {
    console.log(error);
  }
}

function sendMessage(user: Express.User, content: string, room: string) {
  const { username, avatar } = user;
  const response = JSON.stringify({
    type: 'message',
    content,
    user: { username, avatar },
    date: new Date(),
  });
  console.log(response);
  try {
    rooms[room].sockets.forEach((ws) => {
      ws.send(response);
    });
  } catch (error) {
    console.log(error);
  }
}

function blockAction(ws: WebSocket, type: string) {
  ws.send(
    JSON.stringify({
      type: 'blocked',
      message: 'User not logged in.',
    })
  );
  ws.close(1000);
}

function removeFromRoom(ws: WebSocket, room: string) {
  if (rooms[room]) {
    rooms[room].sockets.delete(ws);
    if (!rooms[room].sockets.size) {
      delete rooms[room];
    }
  }
}

function joinRoom(ws: WebSocket, user: Express.User, room: string) {
  if (!rooms[room]) {
    rooms[room] = { sockets: new Set(), users: [] };
  }
  rooms[room].sockets.add(ws);
  rooms[room].users.push(user.username);
  rooms[room].sockets.forEach((ws) =>
    ws.send(JSON.stringify({ type: 'roomUsers', users: rooms[room].users }))
  );
}

export default websocketHandler;
