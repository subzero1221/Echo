const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const session = require("express-session");
const crypto = require("crypto");
const passport = require("passport");
const { Strategy } = require("passport-local");
const path = require("path");
const { domains } = require("googleapis/build/src/apis/domains");
const sendEmail = require("../utils/email");
require("dotenv").config({ path: ".env" });

passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(
  new Strategy(
    { usernameField: "identifier" },
    async (identifier, password, done) => {
      try {
        const query = identifier.includes("@")
          ? { email: identifier }
          : { nickName: identifier };

        const user = await User.findOne(query).select("+password");

        if (!user || !(await user.correctPassword(password, user.password))) {
          return done(null, false, {
            message: "Email/Nickname or password is incorrect",
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

exports.signup = catchAsync(async (req, res, next) => {
  const { nickName, email, password, passwordConfirm } = req.body;

  const newUser = await User.create({
    nickName,
    email,
    password,
    passwordConfirm,
  });

  await new Promise((resolve, reject) => {
    req.login(newUser, (err) => {
      if (err) reject(new AppError("Auto-login failed after signup", 500));
      resolve();
    });
  });

  await new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) reject(new AppError("Session save failed", 500));
      resolve();
    });
  });

  res.status(201).json({
    status: "success",
    user: newUser,
  });
});

exports.signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const authenticateUser = () =>
    new Promise((resolve, reject) => {
      passport.authenticate("local", (err, user, info) => {
        if (err) return reject(err);
        if (!user) return reject(new AppError(info.message, 401));
        resolve(user);
      })(req, res, next);
    });

  const user = await authenticateUser();

  await new Promise((resolve, reject) => {
    req.login(user, (err) => {
      if (err) return reject(new AppError("Login process failed", 500));
      resolve();
    });
  });

  await user.getImageUrl();

  res.status(200).json({
    status: "success",
    message: "You are logged in",
    user: req.user,
  });
});

exports.signout = catchAsync(async (req, res, next) => {
  await new Promise((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) return reject(err);
      resolve();
    });
  });

  res.clearCookie("connect.sid", {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
  });

  req.logout(() => {});

  res.status(200).json({
    status: "success",
    message: "You are logged out",
  });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return next(new AppError("User with this email not found", 404));

  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `http://localhost:3000/reset-password/${resetToken}`;

  try {
    sendEmail({
      email: user.email,
      subject: "Reset your password (valid 10 min)",
      resetURL,
    });
    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (error) {
    (user.passwordResetToken = undefined),
      (user.passwordResetExpires = undefined),
      await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending email. Try again later!", 500)
    );
  }
});

exports.checkAuth = catchAsync(async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    status: "fail",
    isAuthenticated: false,
    message: "You are not logged in. Please log in to access this resource.",
  });
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, passwordConfirm } = req.body;
  const { resetToken } = req.params;
  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  req.notificationInfo = {
    recipient: user._id,
    type: "info",
    message: `You updated password`,
    about: {
      id: "NOID",
      model: "NOMODEL",
    },
  };
  res.status(200).json({
    status: "success",
  });
});

exports.checkStatus = catchAsync(async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return next();
});
