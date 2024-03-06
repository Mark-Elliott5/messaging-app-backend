import { Schema, Model, model } from 'mongoose';

export interface IWaldo {
  name: string;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const waldoSchema = new Schema<IWaldo, Model<IWaldo>>({
  name: { type: String, required: true },
  minX: { type: Number, required: true },
  minY: { type: Number, required: true },
  maxX: { type: Number, required: true },
  maxY: { type: Number, required: true },
});

export const Waldo = model('Waldo', waldoSchema);
