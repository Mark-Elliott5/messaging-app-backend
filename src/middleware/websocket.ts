import WebSocket from 'ws';
import { IReq, ISendMessage, UserAction } from '../types/express';

const rooms: {
  [key: string]: WebSocket[];
} = {};

function websocketHandler(ws: WebSocket, req: IReq) {
  if (!req.user) {
    blockAction(ws, 'Connect');
    return;
  }

  ws.on('message', function (msg: WebSocket.RawData) {
    if (!req.user) {
      blockAction(ws, 'Message');
      return;
    }
    const data: UserAction = JSON.parse(msg.toString());
    console.log(data);
    const { action } = data;
    if (action === 'submitMessage') {
      sendMessage(ws, req.user, data.content);
    }
    if (action === 'joinRoom') {
      joinRoom(ws, data.room);
    }
    if (action === 'typing') {
      sendTyping(ws);
    }
    // ws.send(msg);
  });
}

function sendMessage(ws: WebSocket, user: Express.User, content: string) {
  const { username, avatar } = user;
  const response = JSON.stringify({
    type: 'message',
    message: content,
    user: { username, avatar },
    date: new Date(),
  });
  console.log(response);
  ws.send(response);
}

function blockAction(ws: WebSocket, type: string) {
  ws.send(
    JSON.stringify({
      type: 'blocked',
      message: 'User not logged in.',
    })
  );
  ws.close(1000);
  console.log(`${type} blocked!`);
}

function joinRoom(ws: WebSocket, room: string) {
  if (!rooms[room]) {
    rooms[room] = [];
  }
  rooms[room].push(ws);
}

export default websocketHandler;
