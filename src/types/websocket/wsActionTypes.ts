interface ISendMessage {
  action: 'sendMessage';
  content: string; // FormDataEntryValue
}

interface ITypingIndication {
  action: 'typing';
  typing: boolean;
}

interface IJoinRoom {
  action: 'joinRoom';
  room: string;
}

interface IJoinDMRoom {
  action: 'joinDMRoom';
  room: string;
}

interface ICreateDMRoom {
  action: 'createDMRoom';
  receiver: string;
}

interface IUpdateProfile {
  action: 'updateProfile';
  profile: {
    avatar: number;
    bio: string;
  };
}

type UserAction =
  | ISendMessage
  | ITypingIndication
  | IJoinRoom
  | IJoinDMRoom
  | ICreateDMRoom
  | IUpdateProfile;

export type {
  UserAction,
  IJoinRoom,
  ISendMessage,
  ICreateDMRoom,
  IJoinDMRoom,
  ITypingIndication,
  IUpdateProfile,
};
