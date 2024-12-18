import { Schema, Model, Types, model } from 'mongoose';
import { IContentMessage } from '../websocket/wsMessageTypes';

export interface IMessageModel extends IContentMessage {
  room: string;
  guest: boolean;
}

const messageSchema = new Schema<IMessageModel, Model<IMessageModel>>({
  content: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 900,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: function () {
      return this.guest === false ? 'User' : 'Guest';
    },
  },
  date: { type: Date, required: true },
  room: { type: String, required: true },
  guest: { type: Boolean },
});

export const Message = model('Message', messageSchema);
