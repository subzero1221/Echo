const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: {
    type: String,
    enum: [
      "friend_request",
      "accepted_friend_request",
      "declined_friend_request",
      "info",
      "react",
      "comment",
      "community",
      "message",
      "share",
      "reply",
    ],
    required: true,
  },
  about: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    model: {
      type: String,
      required: true,
      enum: [
        "Post",
        "Comment",
        "Reply",
        "Reaction",
        "Friend",
        "Share",
        "Community",
      ],
    },
  },
  message: { type: String },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;
