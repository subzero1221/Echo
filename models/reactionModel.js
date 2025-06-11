const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["cool", "love", "haha", "sad", "angry"],
      required: true,
    },
  },
  { timestamps: true }
);

reactionSchema.index({ postId: 1, userId: 1 }, { unique: true });

const Reaction = mongoose.model("Reaction", reactionSchema);

module.exports = Reaction;
