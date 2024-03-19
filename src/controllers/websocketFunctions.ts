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
  IProfileMessage,
  IUsersOnlineMessage,
  ILoggedOutMessage,
} from '../types/websocket/wsMessageTypes';
import {
  IAllSockets,
  IDMRoom,
  IDMRooms,
  IRoom,
  IRooms,
  IUsersOnlineMap,
} from '../types/websocket/wsRoomTypes';
import { User } from '../types/mongoose/User';
import { IUpdateProfile } from '../types/websocket/wsActionTypes';
import BadWordsFilter from 'bad-words';

const filter = new BadWordsFilter({ placeHolder: '*' });

function sendTyping(
  user: IOnlineUser,
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
  user: IOnlineUser,
  content: string,
  rooms: IRooms,
  room: string
) {
  // making sure to not send user.password accidentally
  const { username, avatar, bio, _id } = user;
  const messageResponse: IContentMessage = {
    type: 'message',
    content: (() => {
      try {
        return filter.clean(content);
      } catch (err) {
        console.log(err);
        return content;
      }
    })(),
    user: _id,
    date: new Date(),
    guest: user.guest,
  };
  try {
    const dbMessage: IMessageModel = {
      ...messageResponse,
      room,
      guest: user.guest,
    };
    await Message.create(dbMessage);
    messageResponse.user = { username, avatar, bio };
    if (rooms[room].messages.length >= 90) {
      rooms[room].messages.pop();
    }
    rooms[room].messages.splice(0, 0, messageResponse);
    const jsonString = JSON.stringify(messageResponse);
    rooms[room].sockets.forEach((ws) => {
      ws.send(jsonString);
    });
  } catch (err) {
    console.log(err);
  }
}

function sendDM(
  user: IOnlineUser,
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
    guest: user.guest,
  };
  if (dmRooms[room].messages.length >= 90) {
    dmRooms[room].messages.pop();
  }
  dmRooms[room].messages.splice(0, 0, dm);
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

function sendDMTabs(
  usersOnline: IUsersOnlineMap,
  dmRooms: IDMRooms,
  room: string
) {
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
  usersOnline.get(sender.username)?.ws.send(JSON.stringify(senderTab));
  usersOnline.get(receiver.username)?.ws.send(JSON.stringify(receiverTab));
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
  user: IOnlineUser,
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
  user: IOnlineUser,
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
  user: IOnlineUser,
  usersOnline: IUsersOnlineMap,
  dmRooms: IDMRooms,
  receiver: string
) {
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
  user: IOnlineUser,
  dmRooms: IDMRooms,
  room: string
) {
  const { username } = user;
  dmRooms[room].users.set(username, user);
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

function updateProfile(
  ws: WebSocket,
  user: IOnlineUser,
  profile: IUpdateProfile['profile']
) {
  (async () => {
    try {
      await User.findByIdAndUpdate(user._id, {
        avatar: profile.avatar,
        bio: profile.bio,
      }).exec();
    } catch (err) {
      console.log(err);
    }
  })();
  const newProfile = {
    username: user.username,
    avatar: profile.avatar,
    bio: profile.bio,
  };
  const profileMessage: IProfileMessage = {
    type: 'profile',
    profile: newProfile,
  };
  const jsonString = JSON.stringify(profileMessage);
  ws.send(jsonString);
  return newProfile;
}

function getIResponseUsersFromRoom(
  users: Set<IOnlineUser> | Map<string, IOnlineUser>
) {
  const newUsers: IResponseUser[] = Array.from(users.values()).map(
    ({ ws, ...data }) => data
  );
  return newUsers;
}

function handleClose(
  ws: WebSocket,
  allSockets: IAllSockets,
  user: IOnlineUser,
  usersOnline: IUsersOnlineMap,
  rooms: IDMRooms | IRooms,
  roomId: string
) {
  sendTyping(user, false, rooms, roomId);
  usersOnline.delete(user.username);
  allSockets.delete(ws);
  const usersOnlineMessage: IUsersOnlineMessage = {
    type: 'usersOnline',
    usersOnline: getIResponseUsersFromRoom(usersOnline),
  };
  const jsonString = JSON.stringify(usersOnlineMessage);
  allSockets.forEach((ws) => {
    ws.send(jsonString);
  });
  removeFromRoom(ws, user, rooms, roomId);
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
        .populate({ path: 'user', select: 'username avatar bio' })
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

function cleanupDMRooms(dmRooms: IDMRooms) {
  // check dmRooms for time last message was sent, then delete room
  Object.keys(dmRooms).forEach((room) => {
    const { messages } = dmRooms[room];
    const lastMessage = messages[messages.length - 1].date;
    const moment = new Date();
    const minutesPassed =
      (moment.getMilliseconds() - lastMessage.getMilliseconds()) / (1000 * 60);
    if (minutesPassed >= 15 && !dmRooms[room].sockets.size) {
      delete dmRooms[room];
    }
  });
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
  updateProfile,
  handleClose,
};
