import WebSocket from 'ws';
import { IMessageModel, Message } from '../types/mongoose/Messages';
import {
  ITypingMessage,
  IDMTabMessage,
  IBlockedMessage,
  IRoomUsersMessage,
  IJoinRoomMessage,
  IMessageHistoryMessage,
  IOnlineUser,
  IResponseUser,
  IContentMessage,
} from '../types/websocket/wsMessageTypes';
import {
  IDMRoom,
  IDMRooms,
  IRoom,
  IRooms,
  IUsersOnlineMap,
} from '../types/websocket/wsRoomTypes';
import { User } from '../types/mongoose/User';
import { IEditProfile } from '../types/websocket/wsActionTypes';

function sendTyping(
  user: Express.User,
  typing: boolean,
  rooms: IDMRooms | IRooms,
  room: string
) {
  const { username, avatar, bio }: IResponseUser = user;
  const typingMessage: ITypingMessage = {
    type: 'typing',
    typing,
    user: { username, avatar, bio },
  };
  const jsonString = JSON.stringify(typingMessage);
  try {
    rooms[room].sockets.forEach((ws) => ws.send(jsonString));
    return;
  } catch (error) {
    console.log(error);
  }
}

async function sendMessage(
  user: Express.User,
  content: string,
  rooms: IRooms,
  room: string
) {
  // making sure to not send user.password accidentally
  const { username, avatar, bio }: IResponseUser = user;
  const message: IContentMessage = {
    type: 'message',
    content,
    user: { username, avatar, bio },
    date: new Date(),
  };
  console.log(message);
  const jsonString = JSON.stringify(message);
  if (rooms[room].messages.length >= 90) {
    rooms[room].messages.shift();
  }
  rooms[room].messages.push(message);
  rooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
  try {
    const dbMessage: IMessageModel = Object.assign({ room }, message);
    await Message.create(dbMessage);
  } catch (err) {
    console.log(err);
  }
  return;
}

function sendDM(
  user: Express.User,
  content: string,
  usersOnline: IUsersOnlineMap,
  dmRooms: IDMRooms,
  room: string
) {
  const { username, avatar, bio }: IResponseUser = user;
  const dm: IContentMessage = {
    type: 'message',
    content,
    user: { username, avatar, bio },
    date: new Date(),
  };
  if (dmRooms[room].messages.length >= 90) {
    dmRooms[room].messages.shift();
  }
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

function sendDMTabs(dmRooms: IDMRooms, room: string) {
  const receiver = dmRooms[room].receiver;
  const sender = dmRooms[room].sender;
  const senderTab: IDMTabMessage = {
    type: 'dmTab',
    sender: {
      username: receiver.username,
      avatar: receiver.avatar,
      bio: receiver.bio,
    },
    room,
  };
  const receiverTab: IDMTabMessage = {
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
  const blockMessage: IBlockedMessage = {
    type: 'blocked',
    message,
  };
  const jsonString = JSON.stringify(blockMessage);
  ws.send(jsonString);
}

function joinRoom(
  ws: WebSocket,
  user: Express.User,
  usersOnline: IUsersOnlineMap,
  rooms: IRooms,
  room: string
) {
  if (!rooms[room]) {
    const newRoom: IRoom = {
      sockets: new Set(),
      users: new Map(),
      messages: [],
    };
    rooms[room] = newRoom;
  }
  rooms[room].sockets.add(ws);
  rooms[room].users.set(user.username, usersOnline.get(user.username)!);
  const joinRoomMessage: IJoinRoomMessage = {
    type: 'joinRoom',
    room,
  };
  const roomUsersMessage: IRoomUsersMessage = {
    type: 'roomUsers',
    roomUsers: getIResponseUsersFromRoom(rooms[room].users),
  };
  const messageHistoryMessage: IMessageHistoryMessage = {
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

function removeFromRoom(
  ws: WebSocket,
  user: Express.User,
  rooms: IDMRooms | IRooms,
  room: string
) {
  if (!rooms[room]) {
    return;
  }
  rooms[room].sockets.delete(ws);
  rooms[room].users.delete(user.username);
  const roomUsersMessage: IRoomUsersMessage = {
    type: 'roomUsers',
    roomUsers: getIResponseUsersFromRoom(rooms[room].users),
  };
  const jsonString = JSON.stringify(roomUsersMessage);
  rooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
}

function createDMRoom(
  user: Express.User,
  usersOnline: IUsersOnlineMap,
  dmRooms: IDMRooms,
  receiver: string
) {
  if (user.username === receiver) {
    return;
  }
  const existingRoom = `${receiver} & ${user.username}`;
  if (dmRooms[existingRoom]) {
    return existingRoom;
  }
  const room = `${user.username} & ${receiver}`;
  if (!dmRooms[room]) {
    const receiverOnline = usersOnline.get(receiver);
    if (!receiverOnline) {
      return;
    }
    const sender = usersOnline.get(user.username)!;
    const newRoom: IDMRoom = {
      sockets: new Set(),
      users: new Map(),
      messages: [],
      sender,
      receiver: receiverOnline,
    };
    dmRooms[room] = newRoom;
  }
  return room;
}

function joinDMRoom(
  ws: WebSocket,
  user: Express.User,
  dmRooms: IDMRooms,
  room: string
) {
  const { username, avatar, bio }: IResponseUser = user;
  dmRooms[room].users.set(username, {
    username,
    avatar,
    bio,
    ws,
  });
  dmRooms[room].sockets.add(ws);
  const joinRoomMessage: IJoinRoomMessage = {
    type: 'joinRoom',
    room,
  };
  const messageHistoryMessage: IMessageHistoryMessage = {
    type: 'messageHistory',
    messageHistory: dmRooms[room].messages,
  };
  ws.send(JSON.stringify(joinRoomMessage));
  ws.send(JSON.stringify(messageHistoryMessage));
  const roomUsersMessage: IRoomUsersMessage = {
    type: 'roomUsers',
    roomUsers: getIResponseUsersFromRoom(dmRooms[room].users),
  };
  const jsonString = JSON.stringify(roomUsersMessage);
  dmRooms[room].sockets.forEach((ws) => {
    ws.send(jsonString);
  });
}

function cleanupDMRooms(dmRooms: IDMRooms) {
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

async function updateUser(
  user: Express.User,
  profile: IEditProfile['profile']
) {
  try {
    const newDetails = { avatar: 0, bio: '' };
    if (profile.avatar && typeof profile.avatar === 'number') {
      if (profile.avatar < 0 || profile.avatar > 13) {
        throw new Error('Avatar not in range 0-13.');
      }
      newDetails.avatar = profile.avatar;
    }
    if (profile.bio) {
      if (typeof profile.bio !== 'string') {
        throw new Error('Bio must be a string.');
      }
      newDetails.bio = profile.bio;
    }
    await User.findByIdAndUpdate(user._id, newDetails).exec();
  } catch (err) {
    return err;
  }
}

function getIResponseUsersFromRoom(
  users: Set<IOnlineUser> | Map<string, IOnlineUser>
) {
  const newUsers: IResponseUser[] = Array.from(users.values()).map(
    ({ ws, ...data }) => data
  );
  console.log(newUsers);
  return newUsers;
}

// room functions

function populateRoomHistory() {
  const roomNames = [
    'General',
    'Gaming',
    'Music',
    'Sports',
    'Computer Science',
  ];
  const generateRoom = async (room: string) => {
    const newRoom: IRoom = {
      users: new Map(),
      sockets: new Set(),
      messages: [],
    };
    try {
      const history = await Message.find({ room })
        .sort({ date: -1 })
        .limit(90)
        .exec();
      newRoom.messages = history;
    } catch (err) {
      console.log(err);
    }
    return newRoom;
  };
  const rooms: IRooms = {};
  roomNames.forEach(async (room) => {
    const populatedRoom = await generateRoom(room);
    rooms[room] = populatedRoom;
  });
  return rooms;
}

export {
  blockAction,
  cleanupDMRooms,
  createDMRoom,
  getIResponseUsersFromRoom,
  joinDMRoom,
  joinRoom,
  populateRoomHistory,
  removeFromRoom,
  sendDM,
  sendDMTabs,
  sendMessage,
  sendTyping,
  updateUser,
};
