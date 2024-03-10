import { Schema, Model, Types, model } from 'mongoose';

export interface IUser {
  _id: Types.ObjectId;
  username: string;
  password: string;
  bio: string;
  avatar: number;
}

const userSchema = new Schema<IUser, Model<IUser>>({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: { type: String },
  avatar: { type: Number },
});

export const User = model('User', userSchema);
