import { Application } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import 'dotenv/config';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { User } from '../types/mongoose/User';

const configureAuthentication = (app: Application) => {
  const secret =
    process.env.SECRET ??
    (() => {
      throw new Error('.env secret key not found! Sessions need a secret key.');
    })();

  app.use(
    session({
      secret,
      resave: false,
      saveUninitialized: true,
    })
  );
  // app.use(flash());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await User.findOne({ username });
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

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (_id, done) => {
    try {
      const user = await User.findById(_id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
};

export default configureAuthentication;
