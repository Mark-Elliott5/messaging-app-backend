import { Schema, Model, Types, model } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  password: string;
  bio: string;
  avatar: number;
}

const userSchema = new Schema<IUser, Model<IUser>>({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    maxlength: 16,
  },
  password: { type: String, required: true, minlength: 4 },
  bio: { type: String, default: '', maxlength: 900 },
  avatar: { type: Number, default: 1, min: 0, max: 13 },
});

export const User = model('User', userSchema);
