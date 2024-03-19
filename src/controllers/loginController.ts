import passport, { AuthenticateCallback } from 'passport';
import { INext, IReq, IRes } from '../types/express';
import { User } from '../types/mongoose/User';
import bcrypt from 'bcryptjs';
import { Guest } from '../types/mongoose/Guest';
import BadWordsFilter from 'bad-words';

const filter = new BadWordsFilter({ placeHolder: '*' });

const loginHandler = (
  req: IReq<{ username: string; password: string }>,
  res: IRes,
  next: INext
) => {
  passport.authenticate('local', function (err, user) {
    if (err) {
      console.log('err');
      return res.json({
        authenticated: false,
        message: 'Server error. Try again.',
      });
    }
    if (!user) {
      return res.json({
        authenticated: false,
        message: 'User not found.',
      });
    }
    req.logIn(user, { session: true }, (err) => {
      console.log(err);
    });
    res.json({ authenticated: true });
  } as AuthenticateCallback)(req, res, next);
};

const registerHandler = async (
  req: IReq<{ username: string; password: string }>,
  res: IRes,
  next: INext
) => {
  const { username, password } = req.body;
  try {
    if (filter.isProfane(username)) {
      throw new Error('Username invalid.');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      avatar: 1,
      bio: '',
    });
    next();
  } catch (err) {
    next(err);
  }
};

const guestHandler = async (
  req: IReq<{ username: string }>,
  res: IRes,
  next: INext
) => {
  if (req.body.username.length > 5 || req.body.username.length < 1) {
    return res.json({
      authenticated: false,
      message: 'Guest names can only be 1-5 characters.',
    });
  }
  const username = `Guest-${req.body.username}`;
  await Guest.create({
    username,
    password: '',
    avatar: 0,
    bio: '',
  });
  req.body.username = username;
  passport.authenticate('guest', function (err, user) {
    if (err) {
      console.log(err);
      return res.json({
        authenticated: false,
        message: 'Server error. Try again.',
      });
    }
    if (!user) {
      return res.json({
        authenticated: false,
        message: 'User not found.',
      });
    }
    req.logIn(user, { session: true }, (err) => {
      console.log(err);
    });
    res.json({ authenticated: true });
  } as AuthenticateCallback)(req, res, next);
};

export { guestHandler, loginHandler, registerHandler };
