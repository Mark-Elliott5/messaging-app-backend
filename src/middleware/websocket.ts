import WebSocket from 'ws';
import { IReq } from '../types/express';
import { UserAction } from '../types/websocket/wsActionTypes';
import { IMessageModel, Message } from '../types/mongoose/Messages';
import { IDMTab, IUser } from '../types/websocket/wsMessageTypes';

const allSockets: Set<WebSocket> = new Set();

const rooms: {
  [key: string]: {
    users: Set<IUser>;
    sockets: Set<WebSocket>;
    messages: IMessageModel[];
  };
} = {};

const dmRooms: {
  [key: string]: {
    users: Set<string>;
    sockets: Set<WebSocket>;
    sender: IUser;
    receiver: IUser;
    messages: {
      content: string;
      date: Date;
      user: { username: string; avatar: number };
    }[];
  };
} = {};

const usersOnline: Map<string, IUser> = new Map();

function websocketHandler(ws: WebSocket, req: IReq) {
  if (!req.user) {
    blockAction(ws, 'Connect');
    return;
  }

  let inDMRoom = false;

  let roomId = 'general';

  allSockets.add(ws);

  usersOnline.set(req.user.username, {
    username: req.user.username,
    avatar: req.user.avatar,
    bio: req.user.bio,
    ws,
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
    if (action === 'sendMessage') {
      if (inDMRoom) {
        sendDM(req.user, data.content, roomId);
        sendDMTabs(roomId);
        return;
      }
      console.log('sendMessage');
      sendMessage(req.user, data.content, roomId);
    }
    if (action === 'joinRoom') {
      console.log('joinRoom');
      sendTyping(req.user, false, roomId);
      removeFromRoom(ws, roomId);
      roomId = data.room;
      joinRoom(ws, req.user, roomId);
    }
    if (action === 'joinDMRoom') {
      console.log('joinDMRoom');
      const dmRoom = joinDMRoom(ws, req.user, data.receiver);
      if (!dmRoom) {
        ws.send(JSON.stringify({ type: 'blocked', message: 'Access denied.' }));
        return;
      }
      sendTyping(req.user, false, roomId);
      removeFromRoom(ws, roomId);
      inDMRoom = true;
      roomId = dmRoom;
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

async function sendMessage(user: Express.User, content: string, room: string) {
  // making sure to not send user.password accidentally
  const { username, avatar } = user;
  const response: IMessageModel = {
    type: 'message',
    content,
    user: { username, avatar },
    date: new Date(),
    room,
  };
  console.log(response);
  rooms[room].messages.push(response);
  rooms[room].sockets.forEach((ws) => {
    ws.send(JSON.stringify(response));
  });
  try {
    await Message.create(response);
  } catch (err) {
    console.log(err);
  }
  return;
}

function sendDM(user: Express.User, content: string, room: string) {
  const { username, avatar } = user;
  const response: IMessageModel = {
    type: 'message',
    content,
    user: { username, avatar },
    date: new Date(),
    room,
  };
  dmRooms[room].messages.push(response);
  dmRooms[room].sockets.forEach((ws) => {
    ws.send(JSON.stringify(response));
  });
}

function sendDMTabs(room: string) {
  const receiver = dmRooms[room].receiver;
  const sender = dmRooms[room].sender;
  const senderTab: IDMTab = {
    type: 'dmTab',
    sender: receiver,
    room,
  };
  const receiverTab: IDMTab = {
    type: 'dmTab',
    sender: sender,
    room,
  };
  dmRooms[room].sender.ws.send(JSON.stringify(senderTab));
  dmRooms[room].receiver.ws.send(JSON.stringify(receiverTab));
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
  } else if (dmRooms[room]) {
    dmRooms[room].sockets.delete(ws);
    if (!dmRooms[room].sockets.size) {
      delete dmRooms[room];
    }
  }
}

function joinDMRoom(ws: WebSocket, user: Express.User, receiver: string) {
  const room = `${user.username}-${receiver}`;
  if (dmRooms[room]) {
    if (!dmRooms[room].users.has(user.username)) {
      // make sure request is not coming from malicious user that is not in the DM
      return false; // maybe send 'error' message here, have component display it
    }
  }
  const receiverOnline = usersOnline.get(receiver);
  // if receiver not online
  if (!receiverOnline) {
    return false;
  }
  const sender = usersOnline.get(user.username)!;
  if (!dmRooms[room]) {
    dmRooms[room] = {
      sockets: new Set(),
      users: new Set([user.username, receiver]),
      messages: [],
      sender,
      receiver: receiverOnline,
    };
  }
  dmRooms[room].sockets.add(ws);
  dmRooms[room].sockets.forEach((ws) => {
    ws.send(JSON.stringify({ type: 'roomUsers', users: dmRooms[room].users }));
    ws.send(
      JSON.stringify({
        type: 'messageHistory',
        messageHistory: dmRooms[room].messages,
      })
    );
  });
  return room;
}

function joinRoom(ws: WebSocket, user: Express.User, room: string) {
  if (!rooms[room]) {
    rooms[room] = { sockets: new Set(), users: new Set(), messages: [] };
  }
  rooms[room].sockets.add(ws);
  rooms[room].users.add(usersOnline.get(user.username)!);
  rooms[room].sockets.forEach((ws) => {
    ws.send(JSON.stringify({ type: 'roomUsers', users: rooms[room].users }));
    ws.send(
      JSON.stringify({
        type: 'messageHistory',
        messageHistory: rooms[room].messages,
      })
    );
  });
}

function cleanupDMRooms() {
  //   // check dmRooms for time last message was sent, then delete room
  Object.keys(dmRooms).forEach((room) => {
    const { messages } = dmRooms[room];
    const lastMessage = messages[messages.length - 1].date;
    const moment = new Date();
    const minutesPassed =
      (moment.getMilliseconds() - lastMessage.getMilliseconds()) / (1000 * 60);
    if (minutesPassed >= 15) {
      delete dmRooms[room];
    }
  });
}

// delete rooms every 15 minutes
setInterval(cleanupDMRooms, 900000);

export default websocketHandler;
