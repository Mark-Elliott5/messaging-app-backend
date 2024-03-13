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
  receiver: string;
}

// interface ISendDM {
//   action: 'sendDM';
//   content: string;
//   // room: string;
// }

interface ISendDMTab {
  action: 'dmTab';
  sender: {
    username: string;
    avatar: number;
  };
  room: string;
}

type UserAction = ISendMessage | ITypingIndication | IJoinRoom | IJoinDMRoom;

export type { UserAction, IJoinRoom, ISendMessage, ITypingIndication };
