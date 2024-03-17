import WebSocket from 'ws';
import { IReq } from '../types/express';
import { UserAction } from '../types/websocket/wsActionTypes';
import {
  IProfileMessage,
  IRoomUsersMessage,
  IUsersOnlineMessage,
} from '../types/websocket/wsMessageTypes';
import {
  IRooms,
  IDMRooms,
  IUsersOnlineMap,
  IAllSockets,
} from '../types/websocket/wsRoomTypes';
import {
  blockAction,
  joinRoom,
  getIResponseUsersFromRoom,
  sendDM,
  sendDMTabs,
  sendMessage,
  sendTyping,
  createDMRoom,
  joinDMRoom,
  cleanupDMRooms,
  removeFromRoom,
  updateProfile,
  populateRoomHistory,
} from '../controllers/websocketFunctions';

const allSockets: IAllSockets = new Set();

const rooms: IRooms = populateRoomHistory();

const dmRooms: IDMRooms = {};

const usersOnline: IUsersOnlineMap = new Map();

function websocketHandler(ws: WebSocket, req: IReq) {
  if (!req.user) {
    blockAction(ws, 'User not logged in.');
    ws.close(1000);
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

  joinRoom(ws, req.user, usersOnline, rooms, roomId);
  const usersOnlineMessage: IUsersOnlineMessage = {
    type: 'usersOnline',
    usersOnline: getIResponseUsersFromRoom(usersOnline),
  };
  const usersOnlineString = JSON.stringify(usersOnlineMessage);
  allSockets.forEach((ws) => ws.send(usersOnlineString));

  const userProfile: IProfileMessage = {
    type: 'profile',
    profile: {
      username: req.user.username,
      avatar: req.user.avatar,
      bio: req.user.bio,
    },
  };
  const userProfileString = JSON.stringify(userProfile);
  ws.send(userProfileString);

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
        sendDM(req.user, data.content, usersOnline, dmRooms, roomId);
        sendDMTabs(dmRooms, roomId);
        return;
      }
      console.log('sendMessage');
      sendMessage(
        usersOnline.get(req.user.username)!,
        data.content,
        rooms,
        roomId
      );
      return;
    }
    if (action === 'joinRoom') {
      console.log('joinRoom');
      sendTyping(req.user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, req.user, inDMRoom ? dmRooms : rooms, roomId);
      inDMRoom = false;
      roomId = data.room;
      joinRoom(ws, req.user, usersOnline, rooms, roomId);
      return;
    }
    if (action === 'createDMRoom') {
      console.log('createDMRoom');
      if (req.user.username === data.receiver) {
        blockAction(ws, `You can't DM yourself!`);
        ws.close(1000);
        return;
      }
      const room = createDMRoom(req.user, usersOnline, dmRooms, data.receiver);
      if (!room || room === roomId) return;
      joinDMRoom(ws, req.user, dmRooms, room);
      sendTyping(req.user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, req.user, inDMRoom ? dmRooms : rooms, roomId);
      inDMRoom = true;
      roomId = room;
      return;
    }
    if (action === 'joinDMRoom') {
      console.log('joinDMRoom');
      // make sure request is not coming from malicious user that is not in the DM
      if (!dmRooms[data.room]) {
        blockAction(ws, 'Room does not exist.');
        return;
      }
      if (
        dmRooms[data.room].sender.username !== req.user.username &&
        dmRooms[data.room].receiver.username !== req.user.username
      ) {
        blockAction(ws, 'Access denied');
        return; // maybe send 'error' message here, have component display it
      }
      joinDMRoom(ws, req.user, dmRooms, data.room);
      sendTyping(req.user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, req.user, inDMRoom ? dmRooms : rooms, roomId);
      inDMRoom = true;
      roomId = data.room;
      return;
    }
    if (action === 'typing') {
      console.log('typing');
      sendTyping(req.user, data.typing, inDMRoom ? dmRooms : rooms, roomId);
      return;
    }
    if (action === 'updateProfile') {
      console.log('updateProfile');
      if (data.profile.avatar && typeof data.profile.avatar === 'number') {
        if (data.profile.avatar < 0 || data.profile.avatar > 13) {
          blockAction(ws, 'Avatar not valid.');
        }
      }
      if (data.profile.bio) {
        if (typeof data.profile.bio !== 'string') {
          blockAction(ws, 'Bio not valid.');
        }
      }
      const newProfile = updateProfile(ws, req.user, data.profile);
      if (!newProfile) {
        return;
      }
      usersOnline.set(req.user.username, {
        ws,
        ...newProfile,
      });
      const usersOnlineMessage: IUsersOnlineMessage = {
        type: 'usersOnline',
        usersOnline: getIResponseUsersFromRoom(usersOnline),
      };
      const newUsersOnlineString = JSON.stringify(usersOnlineMessage);
      allSockets.forEach((ws) => ws.send(newUsersOnlineString));
      if (inDMRoom) {
        dmRooms[roomId].users.set(req.user.username, { ws, ...newProfile });
        const dmRoomUsersMessage: IRoomUsersMessage = {
          type: 'roomUsers',
          roomUsers: getIResponseUsersFromRoom(dmRooms[roomId].users),
        };
        const jsonString = JSON.stringify(dmRoomUsersMessage);
        dmRooms[roomId].sockets.forEach((ws) => ws.send(jsonString));
        return;
      }
      rooms[roomId].users.set(req.user.username, { ws, ...newProfile });
      const roomUsersMessage: IRoomUsersMessage = {
        type: 'roomUsers',
        roomUsers: getIResponseUsersFromRoom(rooms[roomId].users),
      };
      const jsonString = JSON.stringify(roomUsersMessage);
      rooms[roomId].sockets.forEach((ws) => ws.send(jsonString));
    }
  });

  ws.on('close', () => {
    if (!req.user) {
      return;
    }
    sendTyping(req.user, false, inDMRoom ? dmRooms : rooms, roomId);
    usersOnline.delete(req.user.username);
    allSockets.delete(ws);
    const usersOnlineMessage: IUsersOnlineMessage = {
      type: 'usersOnline',
      usersOnline: getIResponseUsersFromRoom(usersOnline),
    };
    const jsonString = JSON.stringify(usersOnlineMessage);
    allSockets.forEach((ws) => {
      ws.send(jsonString);
    });
    removeFromRoom(ws, req.user, inDMRoom ? dmRooms : rooms, roomId);
    return;
  });
}

// check for rooms to delete every 15 minutes
setInterval(() => cleanupDMRooms(dmRooms), 900000);

export default websocketHandler;
