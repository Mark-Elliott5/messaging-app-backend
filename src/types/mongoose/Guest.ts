import { Schema, Model, Types, model } from 'mongoose';

export interface IGuest {
  _id: Types.ObjectId;
  username: string;
  password: '';
  bio: '';
  avatar: 0;
}

const guestSchema = new Schema<IGuest, Model<IGuest>>({
  username: { type: String, required: true },
  password: { type: String },
  bio: { type: String },
  avatar: { type: Number },
});

export const Guest = model('Guest', guestSchema);
