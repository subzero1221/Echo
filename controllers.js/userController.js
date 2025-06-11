const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const {
  uploadImageToS3,
  getImageFromS3,
  deleteImageFromS3,
} = require("../utils/fileHandler");
const Community = require("../models/communityModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentsModel");
const Share = require("../models/shareModel");

exports.updateProfileData = catchAsync(async (req, res, next) => {
  console.log("Body:", req.body);

  const { nickName, email } = req.body;
  const user = await User.findById(req.user._id);

  if (!user)
    return new AppError("Something went wrong, try relogin on account.", 401);
  if (nickName) user.nickName = nickName;
  if (email) user.email = email;
  await user.save({ validateBeforeSave: false });

  const avatarUrl = await getImageFromS3(user.avatar);
  user.avatarUrl = avatarUrl;

  res.status(200).json({
    status: "success",
    user,
  });
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { curPassword, newPassword, newPasswordConfirm } = req.body;
  const user = await User.findById(req.user._id).select("+password");
  if (!user) next(new AppError("User not found 404, try later!", 404));

  if (!(await user.correctPassword(req.body.curPassword, user.password))) {
    return next(new AppError("Your current password isn't right", 401));
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;
  user.passwordChangedAt = Date.now();
  const updatedUser = await user.save();

  updatedUser.password = undefined;
  updatedUser.passwordChangedAt = undefined;

  res.status(200).json({
    status: "success",
    user: updatedUser,
  });
});

exports.uploadUserAvatar = catchAsync(async (req, res, next) => {
  const file = req.file;

  const imageName = await uploadImageToS3(file);

  const user = await User.findById(req.user._id);

  if (user.avatar !== "userDefault.jpg") {
    deleteImageFromS3(user.avatar);
  }

  user.avatar = imageName;
  const updatedUser = await user.save({ validateBeforeSave: false });

  const avatarUrl = await getImageFromS3(user.avatar);
  user.avatarUrl = avatarUrl;

  res.status(200).json({
    status: "success",
    user: updatedUser,
  });
});

exports.getUserAvatar = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user.avatar) {
    return next(new AppError("User does not have an avatar.", 404));
  }

  const avatarUrl = await getImageFromS3(user.avatar);

  user.avatarUrl = avatarUrl;

  res.status(200).json({
    status: "success",
    user,
  });
});

exports.getUserCommunities = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const communities = await Community.find({
    $or: [{ creator: userId }, { members: userId }],
  });

  const communitiesWithImages = await Promise.all(
    communities.map(async (community) => {
      community.photoUrl = await getImageFromS3(community.photo);
      return community;
    })
  );

  res.status(200).json({
    status: "success",
    communities: communitiesWithImages,
  });
});

//Other users data

exports.getOtherUserData = catchAsync(async (req, res, next) => {
  const { userId } = req.params;

  console.log(userId);

  const userCommunities = await Community.find({
    $or: [{ creator: userId }, { members: userId }],
  });

  const communitiesWithImages = await Promise.all(
    userCommunities.map(async (community) => {
      community.photoUrl = await getImageFromS3(community.photo);
      return community;
    })
  );

  const user = await User.findById(userId);
  const userWithImage = await user.getImageUrl();

  res.status(200).json({
    status: "success",
    userWithImage,
    communitiesWithImages,
  });
});

exports.getOtherUserPosts = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const posts = await Post.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .populate("createdBy", "nickName")
    .populate("community", "members communityType");

  const filtredPosts = posts.filter((post) => {
    return post?.community?.communityType !== "Private";
  });

  await Promise.all(
    filtredPosts.map(async (post) => {
      await post.getImageUrl();
    })
  );

  res.status(200).json({
    status: "success",
    filtredPosts,
  });
});

exports.getOtherUserComments = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const comments = await Comment.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .populate("postId", "content");

  res.status(200).json({
    status: "success",
    comments,
  });
});

exports.getOtherUserShares = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  const shares = await Share.find({ userId }).populate("post");

  const filtredShares = shares.filter((share) => {
    return share?.community?.communityType !== "Private";
  });

  const sharedPostsWithImage = await Promise.all(
    filtredShares.map(async (share) => {
      share.post.photoUrl = await getImageFromS3(share.post.photo);
      return share;
    })
  );

  res.status(200).json({
    status: "success",
    sharedPostsWithImage,
  });
});
