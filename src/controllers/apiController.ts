import expressAsyncHandler from 'express-async-handler';
import { IGuessWaldo, IReq, IRes, ISubmitName } from '../types/types';
import { Waldo } from '../types/mongoose/Waldo';
import { Player } from '../types/mongoose/Player';
import Filter from 'bad-words';
import { body } from 'express-validator';
import validateBody from '../middleware/validateBody';

const filter = new Filter();

const asyncHandler = expressAsyncHandler;

const guessWaldoValidationFunctions = [
  body('coords.x')
    .exists()
    .isNumeric()
    .withMessage('X coordinate is not numeric.')
    .escape(),
  body('coords.y')
    .exists()
    .isNumeric()
    .withMessage('Y coordinate is not numeric.')
    .escape(),
  body('waldo').exists().isString().withMessage('Waldo field must be a string'),
];

const submitNameValidationFunctions = [
  body('name')
    .exists()
    .isString()
    .withMessage('Username field must be a string')
    .not()
    .contains(/\s/)
    .withMessage('Username field must not contain whitespace characters.')
    .trim()
    .matches(/^[a-zA-Z0-9\-._]+$/)
    .withMessage(
      'Username field must only contain alphanumeric characters, periods, underscores, and/or hyphens.'
    )
    .isLength({ min: 1, max: 20 })
    .withMessage('Username field must be 1-20 characters in length.')
    .escape(),
];

const getLeaderboard = asyncHandler(async (req: IReq, res: IRes) => {
  const leaderboard = await Player.find({}).sort({ time: 1 }).limit(50).exec();
  res.json(leaderboard);
});

const guessWaldo = [
  ...guessWaldoValidationFunctions,

  validateBody,

  asyncHandler(async (req: IReq<IGuessWaldo>, res: IRes) => {
    if (!req.cookies.userId) {
      console.log('No cookie');
      throw new Error('userId cookie not found.');
    }

    if (!req.session) {
      console.log('No session');
      throw new Error('No session.');
    }

    if (
      !req.session.startDate ||
      req.session.endDate ||
      !req.session.waldos ||
      req.session.correctCount === undefined ||
      req.session.win
    ) {
      console.log('No game started');
      throw new Error('A new game has not been started.');
    }

    const waldo = req.session.waldos[req.body.waldo];
    if (!waldo) {
      throw new Error(
        'Waldo not found in list of Waldos the server provided the client.'
      );
    }

    if (waldo.found) {
      console.log('Waldo already found');
      throw new Error('Waldo already found.');
    }

    const { minX, maxX, minY, maxY } = waldo;
    const { x, y } = req.body.coords;
    const correct = (x >= minX && x <= maxX && y >= minY && y <= maxY) ?? false;

    if (correct) {
      req.session.correctCount += 1;
      waldo.found = true;
    }

    if (req.session.correctCount >= 5) {
      req.session.endDate = new Date();
      req.session.win = true;
    }

    res.json({ correct, win: req.session.win });
  }),
];

const startGame = asyncHandler(async (req: IReq, res: IRes) => {
  req.session.endDate = undefined;
  req.session.startDate = new Date();
  req.session.win = false;
  req.session.correctCount = 0;
  const randomWaldos = await Waldo.aggregate([{ $sample: { size: 5 } }]).exec();
  console.log(randomWaldos);
  const waldosObj = randomWaldos.reduce(
    (acc, cur) => Object.assign(acc, { [cur['name']]: cur }),
    {}
  );
  req.session.waldos = waldosObj;
  res.json({ characters: Object.keys(waldosObj) });
});

const submitName = [
  ...submitNameValidationFunctions,

  validateBody,

  asyncHandler(async (req: IReq<ISubmitName>, res: IRes) => {
    if (!req.cookies.userId) {
      throw new Error('userId cookie not found.');
    }
    if (!req.session) {
      throw new Error('No session.');
    }
    if (
      !req.session.startDate ||
      !req.session.endDate ||
      !req.session.waldos ||
      req.session.correctCount !== 5 ||
      !req.session.win
    ) {
      throw new Error('Win conditions not met.');
    }

    const name = filter.clean(req.body.name);

    if (name.length > 20 || name.length < 1) {
      throw new Error('Name must be between 1 - 20 characters.');
    }

    // Player time should be stored in milliseconds.
    // Time is the difference in milliseconds.
    // new Date() because express-session serializes in JSON (Date obj becomes string)
    const time = Math.abs(
      new Date(req.session.endDate).getTime() -
        new Date(req.session.startDate).getTime()
    );

    // Check if user's new time is faster
    const oldPlayerDoc = await Player.findOne({
      userId: req.cookies.userId,
    }).exec();
    if (oldPlayerDoc) {
      if (oldPlayerDoc.time > time) {
        oldPlayerDoc.time = time;
        oldPlayerDoc.name = name;
        await oldPlayerDoc.save();
      }
    } else {
      const player = new Player({
        name,
        time,
        userId: req.cookies.userId,
      });
      await player.save();
    }

    res.json({ accepted: true });
  }),
];

export { guessWaldo, getLeaderboard, startGame, submitName };
