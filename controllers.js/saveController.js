const User = require("../models/userModel");
const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const Save = require("../models/saveModel");
const { getImageFromS3 } = require("../utils/fileHandler");
const AppError = require("../utils/AppError");

exports.savePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const check = await Save.findOne({ userId, post: postId });
  if (check) {
    return next(new AppError("Post is already saved on your wall"));
  }

  const post = await Post.findById(postId).populate("createdBy");

  console.log("Saving Post", post);

  if (post.createdBy._id.toString() === userId.toString()) {
    return res.status(400).json({
      status: "fail",
      message: "You can not save your post, check them on your wall",
    });
  }

  const savedPost = await Save.create({
    post: postId,
    userId,
  });

  return res.status(201).json({
    status: "success",
    savedPost,
  });
});

exports.getSavedPosts = catchAsync(async (req, res, next) => {
  const userId = req.user._id.toString();
  const posts = await Save.find({ userId }).populate("post");

  const savedPosts = await Promise.all(
    posts.map(async (post) => {
      post.post.photoUrl = await getImageFromS3(post.post.photo);
      return post;
    })
  );

  console.log("savedPosts:", savedPosts);

  res.status(200).json({
    status: "success",
    savedPosts,
  });
});

exports.deleteSave = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;
  await Save.deleteOne({ post: postId, userId: userId });
  res.status(200).json({
    status: "success",
  });
});
