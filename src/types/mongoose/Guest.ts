import { Schema, Model, Types, model } from 'mongoose';

export interface IGuest {
  _id: Types.ObjectId;
  username: string;
  password: '';
  bio: '';
  avatar: 0;
}

const guestSchema = new Schema<IGuest, Model<IGuest>>({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 1,
    maxlength: 11,
  },
  bio: { type: String, default: '' },
  avatar: { type: Number, default: 0 },
});

export const Guest = model('Guest', guestSchema);
