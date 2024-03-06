#!/usr/bin/env node */

import 'dotenv/config';
import mongoose from 'mongoose';

import { IWaldo, Waldo } from './Waldo';
import { IPlayer, Player } from './Player';

console.log(
  'Populating the designated MongoDB database with the provided data...'
);

mongoose.set('strictQuery', false);

const mongoDB = process.env.MONGODB_URI ?? '';

async function waldoCreator(waldoData: IWaldo) {
  const waldo = new Waldo(waldoData);

  await waldo.save();
  console.log(`Added item: ${waldoData.name}`);
}

async function createAllWaldos() {
  console.log('Adding articles');
  await Promise.all([
    waldoCreator({
      name: 'Aang',
      minX: 81,
      minY: 30,
      maxX: 85,
      maxY: 33,
    }),
    waldoCreator({
      name: 'G-Man',
      minX: 24,
      minY: 68,
      maxX: 29,
      maxY: 69,
    }),
    waldoCreator({
      name: 'Ice King',
      minX: 2,
      minY: 8,
      maxX: 6,
      maxY: 11,
    }),
    waldoCreator({
      name: 'Mikasa',
      minX: 9,
      minY: 88,
      maxX: 13,
      maxY: 94,
    }),
    waldoCreator({
      name: 'Ghostface',
      minX: 95,
      minY: 53,
      maxX: 99,
      maxY: 60,
    }),
    waldoCreator({
      name: 'Togemon',
      minX: 72,
      minY: 34,
      maxX: 78,
      maxY: 37,
    }),
    waldoCreator({
      name: 'Max Headroom',
      minX: 73,
      minY: 40,
      maxX: 78,
      maxY: 44,
    }),
    waldoCreator({
      name: 'Old Snake',
      minX: 49,
      minY: 18,
      maxX: 54,
      maxY: 21,
    }),
    waldoCreator({
      name: 'Reze',
      minX: 44,
      minY: 19,
      maxX: 49,
      maxY: 24,
    }),
    waldoCreator({
      name: 'Phoenix Wright',
      minX: 48,
      minY: 23,
      maxX: 53,
      maxY: 29,
    }),
    waldoCreator({
      name: 'Fry',
      minX: 4,
      minY: 10,
      maxX: 8,
      maxY: 13,
    }),
    waldoCreator({
      name: 'Adam Jensen',
      minX: 4,
      minY: 13,
      maxX: 9,
      maxY: 18,
    }),
    waldoCreator({
      name: 'Yoshimitsu',
      minX: 55,
      minY: 44,
      maxX: 61,
      maxY: 48,
    }),
    waldoCreator({
      name: 'Hank Hill',
      minX: 5,
      minY: 33,
      maxX: 10,
      maxY: 37,
    }),
    waldoCreator({
      name: 'Skull Knight',
      minX: 15,
      minY: 39,
      maxX: 20,
      maxY: 42,
    }),
    waldoCreator({
      name: 'Jetstream Sam',
      minX: 50,
      minY: 53,
      maxX: 56,
      maxY: 58,
    }),
    waldoCreator({
      name: 'Afro Samurai',
      minX: 62,
      minY: 50,
      maxX: 68,
      maxY: 57,
    }),
    waldoCreator({
      name: 'The Dude',
      minX: 34,
      minY: 61,
      maxX: 39,
      maxY: 66,
    }),
    waldoCreator({
      name: 'Chun Li',
      minX: 9,
      minY: 58,
      maxX: 13,
      maxY: 62,
    }),
    waldoCreator({
      name: 'Isaac Clarke',
      minX: 48,
      minY: 81,
      maxX: 54,
      maxY: 88,
    }),
    waldoCreator({
      name: 'Mr. X',
      minX: 2,
      minY: 91,
      maxX: 10,
      maxY: 99,
    }),
    waldoCreator({
      name: 'Vash',
      minX: 10,
      minY: 78,
      maxX: 23,
      maxY: 82,
    }),
    waldoCreator({
      name: 'Raiden',
      minX: 14,
      minY: 72,
      maxX: 20,
      maxY: 78,
    }),
    waldoCreator({
      name: 'Gollum',
      minX: 35,
      minY: 72,
      maxX: 42,
      maxY: 75,
    }),
    waldoCreator({
      name: 'Tintin',
      minX: 43,
      minY: 68,
      maxX: 49,
      maxY: 72,
    }),
    waldoCreator({
      name: 'Goose',
      minX: 71,
      minY: 55,
      maxX: 76,
      maxY: 58,
    }),
    waldoCreator({
      name: 'Lupin The Third',
      minX: 66,
      minY: 75,
      maxX: 70,
      maxY: 81,
    }),
    waldoCreator({
      name: `Captain K'nuckles`,
      minX: 66,
      minY: 18,
      maxX: 69,
      maxY: 21,
    }),
    waldoCreator({
      name: 'Lady Dimitrescu',
      minX: 81,
      minY: 66,
      maxX: 92,
      maxY: 73,
    }),
    waldoCreator({
      name: 'Deadpool',
      minX: 92,
      minY: 92,
      maxX: 97,
      maxY: 98,
    }),
    waldoCreator({
      name: 'Rocko',
      minX: 65,
      minY: 68,
      maxX: 69,
      maxY: 70,
    }),
    waldoCreator({
      name: 'Skeletor',
      minX: 91,
      minY: 87,
      maxX: 97,
      maxY: 92,
    }),
    waldoCreator({
      name: 'Invader Zim',
      minX: 84,
      minY: 11,
      maxX: 88,
      maxY: 12,
    }),
  ]);
}

async function playerCreator(playerData: IPlayer) {
  const player = new Player(playerData);

  await player.save();
  console.log(`Added item: ${playerData.name}`);
}

async function createAllPlayers() {
  console.log('Adding articles');
  await Promise.all([
    playerCreator({
      name: 'Aang',
      time: 60000,
      userId: 'null',
    }),
    playerCreator({
      name: 'G-Man',
      time: 90000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Ice King',
      time: 120000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Mikasa',
      time: 150000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Ghostface',
      time: 180000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Togemon',
      time: 210000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Max Headroom',
      time: 240000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Old Snake',
      time: 270000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Reze',
      time: 300000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Phoenix Wright',
      time: 330000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Fry',
      time: 360000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Adam Jensen',
      time: 390000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Yoshimitsu',
      time: 420000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Hank Hill',
      time: 450000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Skull Knight',
      time: 480000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Jetstream Sam',
      time: 510000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Afro Samurai',
      time: 540000,
      userId: 'null',
    }),
    playerCreator({
      name: 'The Dude',
      time: 570000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Chun Li',
      time: 600000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Isaac Clarke',
      time: 630000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Mr. X',
      time: 660000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Vash',
      time: 690000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Raiden MK',
      time: 720000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Gollum',
      time: 750000,
      userId: 'null',
    }),
    playerCreator({
      name: 'Tintin',
      time: 780000,
      userId: 'null',
    }),
  ]);
}

async function main() {
  console.log('Debug: About to connect');
  await mongoose.connect(mongoDB);
  console.log('Debug: Connected');
  console.log('Creating Waldos');
  await createAllWaldos();

  console.log('Creating Players for leaderboard');

  await createAllPlayers();

  console.log('Debug: Closing mongoose');
  mongoose.connection.close();
}

main().catch((err) => console.log(err));
