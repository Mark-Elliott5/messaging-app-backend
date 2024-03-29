import { Schema, Model, Types, model } from 'mongoose';

export interface IGuest {
  _id: Types.ObjectId;
  username: string;
  password: '';
  bio: '';
  avatar: number;
  guest: true;
}

const guestSchema = new Schema<IGuest, Model<IGuest>>({
  username: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 15,
  },
  password: { type: String, default: '', immutable: true },
  bio: { type: String, default: '', maxlength: 900 },
  avatar: { type: Number, default: 0, min: 0, max: 0 },
  guest: { type: Boolean, required: true, default: true, immutable: true },
});

export const Guest = model('Guest', guestSchema);
