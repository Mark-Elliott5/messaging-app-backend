import express from 'express';
import path from 'path';
import logger from 'morgan';
import 'dotenv/config';
import mongoose from 'mongoose';
// import apiRouter from './routes/api';
import session from 'express-session';
import { INext, IReq, IRes } from './types/express';
import { nanoid } from 'nanoid';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import configureAuthentication from './middleware/configureAuth';
import passport, { AuthenticateCallback } from 'passport';
import { User } from './types/mongoose/User';
import bcrypt from 'bcrypt';
import expressWs from 'express-ws';
import websocketHandler from './middleware/websocket';

// makes typescript aware of app.ws
const app = expressWs(express()).app;

configureAuthentication(app);

// app.set('trust proxy', true);

mongoose.set('strictQuery', true);

async function connectToDB() {
  const mongoDBURI: string = process.env.MONGODB_URI ?? '';
  await mongoose.connect(mongoDBURI);
}
connectToDB().catch((err) => console.log(`Database connection error: ${err}`));

// const limiter = rateLimit({
//   windowMs: 10 * 1000,
//   max: 200,
// });

// app.use(limiter);

app.use(cookieParser());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'build')));

app.use((req: IReq, res: IRes, next: INext) => {
  const { userId } = req.cookies; // : Record<string, string | undefined>
  if (!userId) {
    const id = nanoid();
    res.cookie('userId', id);
  }
  next();
});

// app.use('/api', apiRouter)

app.post('/login', (req: IReq, res: IRes, next: INext) =>
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
    console.log(user);
    req.logIn(user, { session: true }, (err) => {
      console.log(err);
    });
    res.json({ authenticated: true });
  } as AuthenticateCallback)(req, res, next)
);

app.post(
  '/register',
  async (
    req: IReq<{ username: string; password: string }>,
    res: IRes,
    next: INext
  ) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({
        username,
        password: hashedPassword,
      });
      console.log(user);
      res.json({ authenticated: true });
    } catch (err) {
      next(err);
    }
  }
);

app.get('/', (req: IReq, res: IRes) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.ws('/echo', websocketHandler);

// Catch 404
app.use((req: IReq, res: IRes) => {
  console.log('app.ts 404');
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: 'App.ts: The requested resource could not be found on the server.',
  });
});

// error handler
// needs 4 args to register as error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: IReq, res: IRes, next: INext): void => {
  // set locals, only providing error in development
  console.log('App.ts error caught');
  console.log(err);

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(500).json({ error: err });
});

app.listen(3000);

export default app;
