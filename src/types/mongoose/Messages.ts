import { Schema, Model, Types, model } from 'mongoose';
import { IContentMessage } from '../websocket/wsMessageTypes';

export interface IMessageModel extends IContentMessage {
  room: string;
}

const messageSchema = new Schema<IMessageModel, Model<IMessageModel>>({
  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 900,
  },
  user: {
    username: { type: String, required: true },
    avatar: { type: Number, required: true, default: 1, min: 0, max: 13 },
    bio: { type: String, default: '', maxlength: 900 },
  },
  date: { type: Date, required: true },
  room: { type: String, required: true },
});

export const Message = model('Message', messageSchema);
