const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  content: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
  },
  upVotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  downVotes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

commentSchema.methods.handleVote = async function (userId, type) {
  if (type === "up") {
    this.downVotes = this.downVotes.filter((id) => !id.equals(userId));

    if (this.upVotes.some((id) => id.equals(userId))) {
      this.upVotes = this.upVotes.filter((id) => !id.equals(userId));
    } else {
      this.upVotes.push(userId);
    }
  } else if (type === "down") {
    this.upVotes = this.upVotes.filter((id) => !id.equals(userId));

    if (this.downVotes.some((id) => id.equals(userId))) {
      this.downVotes = this.downVotes.filter((id) => !id.equals(userId));
    } else {
      this.downVotes.push(userId);
    }
  }

  await this.save();
  return this;
};

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
