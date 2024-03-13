import { Schema, Model, Types, model } from 'mongoose';
import { IMessage } from '../websocket/wsMessageTypes';

export interface IMessageModel extends IMessage {
  room: string;
}

const messageSchema = new Schema<IMessageModel, Model<IMessageModel>>({
  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 320,
  },
  user: {
    username: { type: String, required: true },
    avatar: { type: Number, required: true },
  },
  date: { type: Date, required: true },
  room: { type: String, required: true },
});

export const Message = model('Message', messageSchema);
