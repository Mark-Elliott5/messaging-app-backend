import { Schema, Model, model } from 'mongoose';

export interface IPlayer {
  name: string;
  time: number;
  userId: string;
}

const playerSchema = new Schema<IPlayer, Model<IPlayer>>({
  name: { type: String, required: true },
  time: { type: Number, required: true },
  userId: { type: String, required: true },
});

export const Player = model('Player', playerSchema);
