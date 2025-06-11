const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const User = require("../models/userModel");
const Post = require("../models/postModel");
const Community = require("../models/communityModel");
const {
  getImageFromS3,
  deleteImageFromS3,
  uploadImageToS3,
} = require("../utils/fileHandler");

exports.createCommunity = catchAsync(async (req, res, next) => {
  const { name, description, type } = req.body;

  const newCommunity = await Community.create({
    name: name,
    description: description,
    creator: req.user._id,
    communityType: type,
    members: [req.user._id],
  });

  res.status(201).json({
    status: "success",
    newCommunity,
  });
});

exports.getCommunity = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const community = await Community.findById(communityId).populate([
    { path: "creator" },
    { path: "joinRequests" },
    { path: "members" },
  ]);
  if (!community) return next(new AppError("Community not found", 404));
  if (community.photo !== "communityDefault.jpg") await community.getImageUrl();
  if (community.cover !== "communityCoverDefault.jpg")
    await community.getCoverImageUrl();

  community.members = community.members.map((member) => new User(member));
  await Promise.all(community.members.map((member) => member.getImageUrl()));

  community.joinRequests = community.joinRequests.map(
    (request) => new User(request)
  );

  await Promise.all(
    community.joinRequests.map((request) => request.getImageUrl())
  );

  res.status(200).json({
    status: "success",
    community,
  });
});

exports.uploadCommunityPhoto = catchAsync(async (req, res, next) => {
  const file = req.file;
  const { communityId } = req.params;

  const imageName = await uploadImageToS3(file);

  const community = await Community.findById(communityId);

  if (community.photo !== "userDefault.jpg") {
    deleteImageFromS3(community.photo);
  }

  community.photo = imageName;
  await community.save({ validateBeforeSave: false });
  await community.getImageUrl();

  res.status(200).json({
    status: "success",
    community,
  });
});

exports.uploadCommunityCoverPhoto = catchAsync(async (req, res, next) => {
  const file = req.file;
  const { communityId } = req.params;

  const imageName = await uploadImageToS3(file);

  const community = await Community.findById(communityId);

  if (community.cover !== "communityCoverDefault.jpg") {
    deleteImageFromS3(community.cover);
  }

  community.cover = imageName;
  await community.save({ validateBeforeSave: false });
  await community.getCoverImageUrl();

  res.status(200).json({
    status: "success",
    community,
  });
});

exports.joinCommunity = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { communityId } = req.params;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found!"));

  if (community.communityType === "Public") {
    await community.joinCommunityMethod(userId);
    return res.status(200).json({
      status: "success",
      members: community.members,
    });
  }

  if (!community.joinRequests.includes(userId)) {
    community.joinRequests.push(userId);
    await community.save();
  }

  res.status(200).json({
    status: "success",
    message: "Administrator got you request!",
  });
});

exports.answerUserRequest = catchAsync(async (req, res, next) => {
  const { userId, answer } = req.body;
  const { communityId } = req.params;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  if (
    !community.creator.equals(req.user._id) &&
    !community.admin.includes(req.user._id)
  ) {
    return next(new AppError("You don't have permission on this action!", 401));
  }

  let message;

  if (answer === "accept") {
    community.members.push(userId);
    community.joinRequests = community.joinRequests.filter(
      (req) => req.toString() !== userId
    );
    await community.save();
    message = `Administrator: Welcome to the community ${community.name}`;
  }

  if (answer === "decline") {
    community.joinRequests = community.joinRequests.filter(
      (req) => req.toString() !== userId
    );
    await community.save();
    message = `Administrator: Unfortunately your request was declined ${community.name}`;
  }

  req.notificationInfo = {
    recipient: userId,
    type: "community",
    message: message,
    about: {
      id: community._id,
      model: "Community",
    },
  };

  next();
});

exports.adminAction = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const { userId, action } = req.body;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  let message;

  if (action === "make" && !community.admin.includes(userId)) {
    community.admin.push(userId);
    message = `Administrator: granted you admin status in the community ${community.name}`;
    await community.save();
  }

  if (action === "remove" && community.admin.includes(userId)) {
    community.admin = community.admin.filter(
      (admin) => admin.toString() !== userId
    );
    message = `Administrator: removed your admin status in the community ${community.name}`;
    await community.save();
  }

  req.notificationInfo = {
    recipient: userId,
    type: "community",
    message: message,
    about: {
      id: community._id,
      model: "Community",
    },
  };

  next();
});

exports.removeMember = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const { userId } = req.body;
  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  community.admin = community.admin.filter(
    (admin) => admin.toString() !== userId
  );

  community.members = community.members.filter(
    (member) => member.toString() !== userId
  );

  await community.save();

  res.status(200).json({
    status: "success",
    message: "User removed successfully",
  });
});

exports.leaveCommunity = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  community.members = community.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  community.admin = community.admin.filter(
    (admin) => admin.toString() !== userId.toString()
  );

  await community.save();

  res.status(200).json({
    status: "success",
    message: "User removed successfully",
  });
});

exports.deleteCommunity = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));
  if (community.creator.toString() !== userId.toString())
    return next(new AppError("Only creator can delete community!", 401));

  deleteImageFromS3(community.photo);
  deleteImageFromS3(community.cover);

  const communityPosts = await Post.find({ community: communityId });

  communityPosts.forEach((post) => deleteImageFromS3(post.photo));

  await Post.deleteMany({ community: communityId });
  await Community.findByIdAndDelete(communityId);

  res.status(200).json({
    status: "success",
    message: "community deleted succsesfully",
  });
});

exports.addCommunityRule = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { communityId } = req.params;
  const { rule } = req.body;

  if (!rule || typeof rule !== "string")
    return next(new AppError("Invalid or missing rule", 400));

  const cleanRule = rule.trim();
  if (!cleanRule) return next(new AppError("Rule cannot be empty", 400));

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  const isAuthorized =
    community.admin.includes(userId.toString()) ||
    community.creator.toString() === userId.toString();

  if (!isAuthorized)
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );

  community.communityRules.push(rule);
  await community.save();

  const rules = community.communityRules;

  res.status(200).json({
    status: "success",
    rules,
  });
});

exports.deleteCommunityRule = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { communityId } = req.params;
  const { ruleIndex } = req.body;

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  const isAuthorized =
    community.admin.includes(userId.toString()) ||
    community.creator.toString() === userId.toString();

  if (!isAuthorized)
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );

  if (
    typeof ruleIndex !== "number" ||
    ruleIndex < 0 ||
    ruleIndex >= community.communityRules.length
  ) {
    return next(new AppError("Invalid rule index", 400));
  }

  community.communityRules.splice(ruleIndex, 1);
  await community.save();

  res.status(200).json({
    status: "success",
    message: "Rule deleted successfully",
    rules: community.communityRules,
  });
});
