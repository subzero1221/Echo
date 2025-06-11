const mongoose = require("mongoose");
const { getImageFromS3 } = require("../utils/fileHandler");

const CommunitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
      default: "communityDefault.jpg",
    },
    photoUrl: {
      type: String,
      default: null,
    },
    cover: {
      type: String,
      default: "communityCoverDefault.jpg",
    },
    coverPhotoUrl: {
      type: String,
      default: null,
    },
    communityType: {
      type: String,
      enum: ["Public", "Restricted", "Private"],
      required: true,
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    admin: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    joinRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    communityRules: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

CommunitySchema.methods.getImageUrl = async function () {
  const imageUrl = await getImageFromS3(this.photo);
  this.photoUrl = imageUrl;
  return this;
};

CommunitySchema.methods.getCoverImageUrl = async function () {
  const imageUrl = await getImageFromS3(this.cover);
  this.coverPhotoUrl = imageUrl;
  return this;
};

CommunitySchema.methods.joinCommunityMethod = async function (userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
  }
  this.save();
  return this;
};

const Community = mongoose.model("Community", CommunitySchema);

module.exports = Community;
