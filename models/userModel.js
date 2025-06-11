const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { getImageFromS3 } = require("../utils/fileHandler");

const userSchema = new mongoose.Schema({
  nickName: {
    type: String,
    required: [true, "Please provide your Nickname"],
  },
  email: {
    type: String,
    required: [true, "Please provide email address"],
    unique: [true, "User with this email already exists"],
    lowercase: true,
    validate: [validator.isEmail, "Please provide valid email"],
  },
  avatar: {
    type: String,
    default: "userDefault.jpg",
  },
  avatarUrl: {
    type: String,
    default: "",
  },
  password: {
    type: String,
    required: [true, "Please provide"],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//// USER Methods

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.getImageUrl = async function () {
  const imageUrl = await getImageFromS3(this.avatar);
  this.avatarUrl = imageUrl;
  return this;
};

userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
