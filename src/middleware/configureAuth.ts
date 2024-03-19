import { Application } from 'express';
import passport from 'passport';
import CustomStrategy from 'passport-custom';
import { Strategy as LocalStrategy } from 'passport-local';
import 'dotenv/config';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import { User } from '../types/mongoose/User';
import { Guest } from '../types/mongoose/Guest';
import { IReq } from '../types/express';

const configureAuthentication = (app: Application) => {
  const secret =
    process.env.SECRET ??
    (() => {
      throw new Error('.env secret key not found! Sessions need a secret key.');
    })();

  const connection =
    process.env.MONGODB_URI ??
    (() => {
      throw new Error(
        'connection string not found! Sessions need a connection string.'
      );
    })();

  app.use(
    session({
      store: MongoStore.create({
        mongoUrl: connection,
      }),
      secret,
      resave: false,
      saveUninitialized: true,
    })
  );
  // app.use(flash());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username }).exec();
        if (!user) {
          return done(null, false);
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.use(
    'guest',
    new CustomStrategy.Strategy(
      async (req: IReq<{ username: string }>, done) => {
        try {
          const guest = await Guest.findOne({
            username: req.body.username,
          }).exec();
          if (!guest) {
            return done(null, false);
          }
          return done(null, guest);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    return done(null, user._id);
  });

  passport.deserializeUser(async (_id, done) => {
    try {
      const user = await User.findById(_id).exec();
      if (user) {
        return done(null, user);
      }
      const guest = await Guest.findById(_id).exec();
      if (guest) {
        return done(null, guest);
      }
    } catch (err) {
      return done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
};

export default configureAuthentication;
