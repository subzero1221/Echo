const mongoose = require("mongoose");
const { getImageFromS3 } = require("../utils/fileHandler");

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide title"],
  },
  content: {
    type: String,
  },
  media: {
    type: String,
    default: "",
  },
  mediaUrl: {
    type: String,
    default: "",
  },
  mediaType: {
    type: String,
    default: null,
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
  views: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  category: {
    type: String,
    required: [true, "Post should have a category"],
  },
  tags: {
    type: [String],
    default: [],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Community",
    default: null,
  },
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  isApproved: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

postSchema.methods.getImageUrl = async function () {
  const imageUrl = await getImageFromS3(this.photo);
  this.photoUrl = imageUrl;
  return this;
};

postSchema.methods.handleVote = async function (userId, type) {
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

postSchema.methods.updatePostViews = async function (viewerID) {
  if (!this.views.includes(viewerID)) this.views.push(viewerID);
  await this.save();
  return this;
};

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
