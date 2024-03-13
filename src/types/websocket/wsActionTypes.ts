interface ISendMessage {
  action: 'submitMessage';
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

type UserAction = ISendMessage | ITypingIndication | IJoinRoom;

export type { UserAction, IJoinRoom, ISendMessage, ITypingIndication };
