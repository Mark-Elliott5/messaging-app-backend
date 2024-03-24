import WebSocket from 'ws';
import { INext, IReq, IRes } from '../types/express';
import { UserAction } from '../types/websocket/wsActionTypes';
import {
  ILoggedOutMessage,
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
  handleClose,
} from '../controllers/websocketFunctions';

const allSockets: IAllSockets = new Set();

const rooms: IRooms = populateRoomHistory();

const dmRooms: IDMRooms = {};

const usersOnline: IUsersOnlineMap = new Map();

function websocketHandler(ws: WebSocket, req: IReq, next: INext) {
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
    guest: req.user.guest,
    _id: req.user._id,
    ws,
  });
  const name = req.user.username;
  const getUser = () => usersOnline.get(name)!;

  joinRoom(ws, getUser(), usersOnline, rooms, roomId);
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
    console.log('data:');
    console.log(data);
    const { action } = data;
    const user = getUser();
    if (action === 'sendMessage') {
      if (typeof data.content !== 'string' || data.content.length > 900) {
        blockAction(ws, 'Message longer than 900 characters.');
        return;
      }
      if (inDMRoom) {
        console.log('inDmRoom');
        sendDM(user, data.content, usersOnline, dmRooms, roomId);
        sendDMTabs(usersOnline, dmRooms, roomId);
        return;
      }
      console.log('sendMessage');
      sendMessage(user, data.content, rooms, roomId);
      return;
    }
    if (action === 'joinRoom') {
      console.log('joinRoom');
      sendTyping(user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, user, inDMRoom ? dmRooms : rooms, roomId);
      inDMRoom = false;
      roomId = data.room;
      joinRoom(ws, user, usersOnline, rooms, roomId);
      return;
    }
    if (action === 'createDMRoom') {
      console.log('createDMRoom');
      if (req.user.username === data.receiver) {
        blockAction(ws, `You can't DM yourself.`);
        return;
      }
      const room = createDMRoom(user, usersOnline, dmRooms, data.receiver);
      if (!room || room === roomId) return;
      joinDMRoom(ws, user, dmRooms, room);
      sendTyping(user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, user, inDMRoom ? dmRooms : rooms, roomId);
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
        blockAction(ws, 'Access denied.');
        return;
      }
      joinDMRoom(ws, user, dmRooms, data.room);
      sendTyping(user, false, inDMRoom ? dmRooms : rooms, roomId);
      removeFromRoom(ws, user, inDMRoom ? dmRooms : rooms, roomId);
      inDMRoom = true;
      roomId = data.room;
      return;
    }
    if (action === 'typing') {
      console.log('typing');
      sendTyping(user, data.typing, inDMRoom ? dmRooms : rooms, roomId);
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
      const newProfile = updateProfile(ws, user, data.profile, req.user.guest);
      if (!newProfile) {
        return;
      }
      usersOnline.set(req.user.username, {
        ...newProfile,
        ws,
        _id: req.user._id,
        guest: req.user.guest,
      });
      const usersOnlineMessage: IUsersOnlineMessage = {
        type: 'usersOnline',
        usersOnline: getIResponseUsersFromRoom(usersOnline),
      };
      const newUsersOnlineString = JSON.stringify(usersOnlineMessage);
      allSockets.forEach((ws) => ws.send(newUsersOnlineString));
      if (inDMRoom) {
        dmRooms[roomId].users.set(req.user.username, {
          ...newProfile,
          ws,
          _id: req.user._id,
          guest: req.user.guest,
        });
        const dmRoomUsersMessage: IRoomUsersMessage = {
          type: 'roomUsers',
          roomUsers: getIResponseUsersFromRoom(dmRooms[roomId].users),
        };
        const jsonString = JSON.stringify(dmRoomUsersMessage);
        dmRooms[roomId].sockets.forEach((ws) => ws.send(jsonString));
        return;
      }
      rooms[roomId].users.set(req.user.username, {
        ...newProfile,
        ws,
        _id: req.user._id,
        guest: req.user.guest,
      });
      const roomUsersMessage: IRoomUsersMessage = {
        type: 'roomUsers',
        roomUsers: getIResponseUsersFromRoom(rooms[roomId].users),
      };
      const jsonString = JSON.stringify(roomUsersMessage);
      rooms[roomId].sockets.forEach((ws) => ws.send(jsonString));
    }
    if (data.action === 'logout') {
      const logoutMessage: ILoggedOutMessage = {
        type: 'loggedOut',
      };
      const jsonLogoutMessage = JSON.stringify(logoutMessage);
      ws.send(jsonLogoutMessage);
      ws.close();
      req.logOut((err) => {
        next(err);
      });
      req.session.destroy(function (err) {
        if (err) {
          console.log(err);
        }
      });
      return;
    }
  });

  ws.on('close', () => {
    const user = getUser();
    handleClose(
      ws,
      allSockets,
      user,
      usersOnline,
      inDMRoom ? dmRooms : rooms,
      roomId
    );
    return;
  });
}

// check for rooms to delete every 15 minutes
setInterval(() => cleanupDMRooms(dmRooms), 900000);

export default websocketHandler;
