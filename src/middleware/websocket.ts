import WebSocket from 'ws';
import { IReq } from '../types/express';
import { UserAction } from '../types/websocket/wsActionTypes';
import { IMessageModel, Message } from '../types/mongoose/Messages';
import {
  IBlocked,
  IDMRooms,
  IDMTab,
  IJoinRoom,
  IMessageHistory,
  IOnlineUser,
  IResponseUser,
  IRoomUsers,
  IRooms,
  ITyping,
  IUsersOnline,
} from '../types/websocket/wsMessageTypes';

const allSockets: Set<WebSocket> = new Set();

const rooms: IRooms = {};

const dmRooms: IDMRooms = {};

const usersOnline: Map<string, IOnlineUser> = new Map();

function websocketHandler(ws: WebSocket, req: IReq) {
  if (!req.user) {
    blockAction(ws, 'User not logged in.');
    return;
  }
  if (usersOnline.has(req.user.username)) {
    usersOnline.get(req.user.username)!.ws.close(1000);
  }

  let inDMRoom = false;

  let roomId = 'General';

  allSockets.add(ws);

  usersOnline.set(req.user.username, {
    username: req.user.username,
    avatar: req.user.avatar,
    bio: req.user.bio,
    ws,
  });

  joinRoom(ws, req.user, roomId);
  const usersOnlineMessage: IUsersOnline = {
    type: 'usersOnline',
    usersOnline: getIResponseUsers(usersOnline),
  };
  const jsonString = JSON.stringify(usersOnlineMessage);
  allSockets.forEach((ws) => ws.send(jsonString));

  ws.on('message', (msg: WebSocket.RawData) => {
    if (!req.user) {
      return;
    }
    const data: UserAction = JSON.parse(msg.toString());
    console.log(data);
    const { action } = data;
    if (action === 'sendMessage') {
      if (inDMRoom) {
        console.log('inDmRoom');
        sendDM(req.user, data.content, roomId);
        sendDMTabs(roomId);
        return;
      }
      console.log('sendMessage');
      sendMessage(req.user, data.content, roomId);
      return;
    }
    if (action === 'joinRoom') {
      console.log('joinRoom');
      sendTyping(req.user, false, inDMRoom, roomId);
      removeFromRoom(ws, req.user, roomId);
      inDMRoom = false;
      roomId = data.room;
      joinRoom(ws, req.user, roomId);
      return;
    }
    if (action === 'createDMRoom') {
      console.log('createDMRoom');
      const room = createDMRoom(ws, req.user, data.receiver);
      if (!room || room === roomId) return;
      joinDMRoom(ws, req.user, room);
      sendTyping(req.user, false, inDMRoom, roomId);
      removeFromRoom(ws, req.user, roomId);
      inDMRoom = true;
      roomId = room;
      return;
    }
    if (action === 'joinDMRoom') {
      console.log('joinDMRoom');
      joinDMRoom(ws, req.user, data.room);
      sendTyping(req.user, false, inDMRoom, roomId);
      removeFromRoom(ws, req.user, roomId);
      inDMRoom = true;
      roomId = data.room;
      return;
    }
    if (action === 'typing') {
      console.log('typing');
      sendTyping(req.user, data.typing, inDMRoom, roomId);
      return;
    }
  });

  ws.on('close', () => {
    if (!req.user) {
      return;
    }
    sendTyping(req.user, false, inDMRoom, roomId);
    usersOnline.delete(req.user.username);
    allSockets.delete(ws);
    const usersOnlineMessage: IUsersOnline = {
      type: 'usersOnline',
      usersOnline: getIResponseUsers(usersOnline),
    };
    const jsonString = JSON.stringify(usersOnlineMessage);
    allSockets.forEach((ws) => {
      ws.send(jsonString);
    });
    removeFromRoom(ws, req.user, roomId);
    return;
  });
}

function sendTyping(
  user: Express.User,
  typing: boolean,
  inDMRoom: boolean,
  room: string
) {
  const { username, avatar, bio } = user;
  const typingMessage: ITyping = {
    type: 'typing',
    typing,
    user: { username, avatar, bio },
  };
  const jsonString = JSON.stringify(typingMessage);
  try {
    if (!inDMRoom) {
      rooms[room].sockets.forEach((ws) => ws.send(jsonString));
      return;
    }
    dmRooms[room].sockets.forEach((ws) => ws.send(jsonString));
  } catch (error) {
    console.log(error);
  }
}

async function sendMessage(user: Express.User, content: string, room: string) {
  // making sure to not send user.password accidentally
  const { username, avatar, bio } = user;
  const message: IMessageModel = {
    type: 'message',
    content,
    user: { username, avatar, bio },
    date: new Date(),
    room,
  };
  console.log(message);
  const jsonString = JSON.stringify(message);
  rooms[room].messages.push(message);
  rooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
  try {
    await Message.create(message);
  } catch (err) {
    console.log(err);
  }
  return;
}

function sendDM(user: Express.User, content: string, room: string) {
  const { username, avatar, bio } = user;
  const dm: IMessageModel = {
    type: 'message',
    content,
    user: { username, avatar, bio },
    date: new Date(),
    room,
  };
  dmRooms[room].messages.push(dm);
  // check for missing user (disconnect/reconnected scenario)
  if (dmRooms[room].sockets.size < 2) {
    const senderSocket = usersOnline.get(dmRooms[room].sender.username)?.ws;
    const receiverSocket = usersOnline.get(dmRooms[room].receiver.username)?.ws;
    senderSocket ? (dmRooms[room].sender.ws = senderSocket) : null;
    receiverSocket ? (dmRooms[room].receiver.ws = receiverSocket) : null;
  }
  const jsonString = JSON.stringify(dm);
  dmRooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
}

function sendDMTabs(room: string) {
  const receiver = dmRooms[room].receiver;
  const sender = dmRooms[room].sender;
  const senderTab: IDMTab = {
    type: 'dmTab',
    sender: {
      username: receiver.username,
      avatar: receiver.avatar,
      bio: receiver.bio,
    },
    room,
  };
  const receiverTab: IDMTab = {
    type: 'dmTab',
    sender: {
      username: sender.username,
      avatar: sender.avatar,
      bio: sender.bio,
    },
    room,
  };
  console.log('sendingTabs');
  dmRooms[room].sender.ws.send(JSON.stringify(senderTab));
  dmRooms[room].receiver.ws.send(JSON.stringify(receiverTab));
}

function blockAction(ws: WebSocket, message: string) {
  const blockMessage: IBlocked = {
    type: 'blocked',
    message,
  };
  const jsonString = JSON.stringify(blockMessage);
  ws.send(jsonString);
  ws.close(1000);
}

function removeFromRoom(ws: WebSocket, user: Express.User, room: string) {
  if (rooms[room]) {
    rooms[room].sockets.delete(ws);
    rooms[room].users.delete(user.username);
    const roomUsersMessage: IRoomUsers = {
      type: 'roomUsers',
      roomUsers: getIResponseUsers(rooms[room].users),
    };
    const jsonString = JSON.stringify(roomUsersMessage);
    rooms[room].sockets.forEach((ws) => {
      ws.send(jsonString);
    });
    // if (!rooms[room].sockets.size) {
    //   delete rooms[room];
    // }
  }
  if (dmRooms[room]) {
    dmRooms[room].sockets.delete(ws);
    dmRooms[room].users.delete(user.username);
    const dmRoomUsersMessage: IRoomUsers = {
      type: 'roomUsers',
      roomUsers: getIResponseUsers(dmRooms[room].users),
    };
    const jsonString = JSON.stringify(dmRoomUsersMessage);
    dmRooms[room].sockets.forEach((ws) => {
      ws.send(jsonString);
    });
    // if (!dmRooms[room].sockets.size) {
    //   delete dmRooms[room];
    // }
    // relegated to cleanup function to delete dmRooms after x time
  }
}

function createDMRoom(ws: WebSocket, user: Express.User, receiver: string) {
  if (user.username === receiver) {
    return;
  }
  const room = `${user.username} & ${receiver}`;
  if (!dmRooms[room]) {
    const receiverOnline = usersOnline.get(receiver);
    if (!receiverOnline) {
      return;
    }
    const sender = usersOnline.get(user.username)!;
    dmRooms[room] = {
      sockets: new Set(),
      users: new Map(),
      messages: [],
      sender,
      receiver: receiverOnline,
    };
  }
  return room;
}

function joinDMRoom(ws: WebSocket, user: Express.User, room: string) {
  if (!dmRooms[room]) {
    const blockedMessage: IBlocked = {
      type: 'blocked',
      message: 'Room does not exist.',
    };
    const jsonString = JSON.stringify(blockedMessage);
    ws.send(jsonString);
    return;
  }
  // make sure request is not coming from malicious user that is not in the DM
  if (
    dmRooms[room].sender.username !== user.username &&
    dmRooms[room].receiver.username !== user.username
  ) {
    const blockedMessage: IBlocked = {
      type: 'blocked',
      message: 'Access denied.',
    };
    const jsonString = JSON.stringify(blockedMessage);
    ws.send(jsonString);
    return; // maybe send 'error' message here, have component display it
  }
  // const receiver = usersOnline.get(dmRooms[room].sender.username);
  // // if receiver not online
  // // if (!receiverOnline) {
  // //   return;
  // // }
  // const sender = usersOnline.get(user.username)!;
  const { username, avatar, bio } = user;
  dmRooms[room].users.set(username, {
    username,
    avatar,
    bio,
    ws,
  });
  dmRooms[room].sockets.add(ws);
  const joinRoomMessage: IJoinRoom = {
    type: 'joinRoom',
    room,
  };
  const messageHistoryMessage: IMessageHistory = {
    type: 'messageHistory',
    messageHistory: dmRooms[room].messages,
  };
  ws.send(JSON.stringify(joinRoomMessage));
  ws.send(JSON.stringify(messageHistoryMessage));
  const roomUsersMessage: IRoomUsers = {
    type: 'roomUsers',
    roomUsers: getIResponseUsers(dmRooms[room].users),
  };
  const jsonString = JSON.stringify(roomUsersMessage);
  dmRooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
}

function joinRoom(ws: WebSocket, user: Express.User, room: string) {
  if (!rooms[room]) {
    rooms[room] = { sockets: new Set(), users: new Map(), messages: [] };
  }
  rooms[room].sockets.add(ws);
  rooms[room].users.set(user.username, usersOnline.get(user.username)!);
  const joinRoomMessage: IJoinRoom = {
    type: 'joinRoom',
    room,
  };
  const roomUsersMessage: IRoomUsers = {
    type: 'roomUsers',
    roomUsers: getIResponseUsers(rooms[room].users),
  };
  const messageHistoryMessage: IMessageHistory = {
    type: 'messageHistory',
    messageHistory: rooms[room].messages,
  };
  const joinRoomJsonString = JSON.stringify(joinRoomMessage);
  const roomUsersJsonString = JSON.stringify(roomUsersMessage);
  const messageHistoryJsonString = JSON.stringify(messageHistoryMessage);
  rooms[room].sockets.forEach((ws) => {
    ws.send(joinRoomJsonString);
    ws.send(roomUsersJsonString);
    ws.send(messageHistoryJsonString);
  });
}

// function convertUsers(IOnlineUsers: Set<IOnlineUser>): Set<IResponseUser> {
//   const IResponseUsers = new Set(
//     Array.from(IOnlineUsers).map((IOnlineUser) => {
//       const { ws, ...IResponseUser } = IOnlineUser;
//       return IResponseUser;
//     })
//   );
//   return IResponseUsers;
// }

function cleanupDMRooms() {
  // check dmRooms for time last message was sent, then delete room
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

function getIResponseUsers(users: Set<IOnlineUser> | Map<string, IOnlineUser>) {
  const newUsers: IResponseUser[] = Array.from(users.values()).map(
    ({ ws, ...data }) => data
  );
  console.log(newUsers);
  return newUsers;
}

// check for rooms to delete every 15 minutes
setInterval(cleanupDMRooms, 900000);

// need the same interval for cleaning up dmRooms/rooms messages
// X message buffer before saving to database

export default websocketHandler;
