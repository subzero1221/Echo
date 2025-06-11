const mongoose = require("mongoose");
const Reaction = require("../models/reactionModel");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const Post = require("../models/postModel");
const { getIO, getOnlineUsers } = require("../socket");

exports.addReaction = catchAsync(async (req, res, next) => {
  const { type } = req.body;
  const { postId } = req.params;
  const userId = req.user._id;

  let reaction = await Reaction.findOne({ postId, userId });

  if (reaction) {
    if (reaction.type === type) {
      await reaction.deleteOne();

      return res.json({ message: "Reaction removed" });
    }

    reaction.type = type;
    await reaction.save();
  } else {
    reaction = new Reaction({ postId, userId, type });
    await reaction.save();
  }

  const post = await Post.findById(postId).select("createdBy");

  if (!post) return res.status(404).json({ message: "Post not found" });

  const recipientId = post.createdBy.toString();

  req.notificationInfo = {
    recipient: recipientId,
    type: "react",
    message: `reacted to your post with ${type}`,
    about: {
      id: reaction._id,
      model: "Reaction",
    },
    postId,
  };

  next();
});

exports.getReactions = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  console.log("returning reactions:", postId);

  const reactions = await Reaction.aggregate([
    {
      $match: { postId: new mongoose.Types.ObjectId(postId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        users: { $push: "$user" },
      },
    },
    {
      $project: {
        _id: 0,
        type: "$_id",
        count: 1,
        users: { _id: 1, username: 1, email: 1 },
      },
    },
  ]);

  if (!reactions) return next(new AppError("Reactions not found", 404));

  console.log(reactions);

  res.status(200).json({
    status: "success",
    reactions,
  });
});
