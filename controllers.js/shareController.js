const User = require("../models/userModel");
const Post = require("../models/postModel");
const catchAsync = require("../utils/catchAsync");
const Share = require("../models/shareModel");
const { getImageFromS3, getVideoFromS3 } = require("../utils/fileHandler");
const AppError = require("../utils/AppError");

exports.sharePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const check = await Share.findOne({ userId, post: postId });

  if (check) {
    return next(new AppError("Post is already shared on your wall"));
  }

  const post = await Post.findById(postId).populate("createdBy");

  console.log("Sharing post:", post);

  if (post.createdBy._id.toString() === userId.toString())
    return next(
      new AppError("You can not share your post, check them on your wall")
    );

  const sharedPost = await Share.create({
    post: postId,
    userId,
  });

  req.notificationInfo = {
    message: `${req.user.nickName} shared your post`,
    recipient: post.createdBy._id,
    type: "share",
    about: {
      id: sharedPost._id,
      model: "Share",
    },
  };

  next();
});

exports.getSharedPosts = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const posts = await Share.find({ userId }).populate({
    path: "post",
    populate: {
      path: "createdBy",
      select: "nickName",
    },
  });

  const filteredPosts = posts.filter(
    (share) =>
      share.post &&
      (share.post.mediaType === "image" || share.post.mediaType === "video")
  );

  const sharedPosts = await Promise.all(
    filteredPosts.map(async (share) => {
      const post = share.post;

      if (post.mediaType === "image") {
        post.mediaUrl = await getImageFromS3(post.media);
      } else if (post.mediaType === "video") {
        post.mediaUrl = await getVideoFromS3(post.media);
      }

      return post;
    })
  );

  res.status(200).json({
    status: "success",
    sharedPosts,
  });
});

exports.deleteShare = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user._id;
  await Share.deleteOne({ post: postId, userId: userId });
  res.status(200).json({
    status: "success",
  });
});
