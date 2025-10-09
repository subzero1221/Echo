const User = require("./../models/userModel");
const Post = require("./../models/postModel");
const Comment = require("./../models/commentsModel");
const Reaction = require("./../models/reactionModel");
const Notification = require("./../models/notificationModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const {
  uploadImageToS3,
  getImageFromS3,
  deleteImageFromS3,
  getImgsFromS3,
  uploadVideoToS3,
  getVideoFromS3,
} = require("../utils/fileHandler");
const { classifyText } = require("../utils/aiTagger");
const { getMostUsedTags } = require("../utils/tagAnalyzer");
const {
  getSinglePostWithImages,
  filterPostsByAccess,
  sanitizeAnonym,
  mapPostWithImages,
  checkIsPostApproved,
  setPrePostApproval,
} = require("../services/postServices");
const Community = require("../models/communityModel");

const normalizeCategory = (category) => {
  return category.trim().toLowerCase().replace(/_/g, " ").replace(/&/g, "and");
};

exports.createPost = catchAsync(async (req, res, next) => {
  const file = req.file || null;
  const communityId =
    req.body.communityId && req.body.communityId !== "undefined"
      ? req.body.communityId
      : null;

  let fileName = "";
  let fileType = "";
  let fileUrl = "";

  console.log("Creating post:", file, communityId);

  if (file) {
    const isImage = file.mimetype.startsWith("image");
    const isVideo = file.mimetype.startsWith("video");

    if (!isImage && !isVideo) {
      return next(new AppError("Unsupported file type", 400));
    }

    fileName = isImage
      ? await uploadImageToS3(file)
      : await uploadVideoToS3(file);

    fileType = isImage ? "image" : "video";
    fileUrl = isImage
      ? await getImageFromS3(fileName)
      : await getVideoFromS3(fileName);
  }

  const category = await classifyText(req.body.content);
  const approval = await setPrePostApproval(communityId, req.user._id);

  console.log("APPROVAL:", approval);

  const newPost = await Post.create({
    title: req.body.title,
    content: req.body.content || "",
    media: fileName,
    mediaType: fileType,
    community: communityId,
    createdBy: req.user._id,
    tags: req.body.tags,
    isAnonymous: req.body.anonymous,
    isApproved: approval,
    category,
  });

  newPost.mediaUrl = fileUrl;

  res.status(201).json({
    status: "success",
    newPost,
  });
});

exports.getPosts = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req?.user?._id || null;

  let posts;

  if (postId) {
    posts = await getSinglePostWithImages(postId, userId);
  } else {
    const allPosts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("createdBy")
      .populate("community", "name communityType members")
      .lean();
    const accessiblePosts = filterPostsByAccess(allPosts, userId);
    const anonymSanitizedPosts = sanitizeAnonym(accessiblePosts);

    const approvedPosts = checkIsPostApproved(anonymSanitizedPosts);
    posts = await Promise.all(approvedPosts.map(mapPostWithImages));
  }

  res.status(200).json({
    status: "success",
    posts,
  });
});

exports.getMyPosts = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const posts = await Post.find({ createdBy: userId })
    .sort({ createdAt: -1 })
    .populate("createdBy")
    .populate("community", "name communityType members")
    .lean();

  const postsWithImages = await Promise.all(posts.map(mapPostWithImages));
  console.log("MY POSTS", postsWithImages);

  res.status(200).json({
    status: "success",
    postsWithImages,
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError("Post not found", 404));
  if (post.createdBy.toString() !== userId.toString()) {
    return next(new AppError("You dont have permission on this action"));
  }

  await deleteImageFromS3(post.media);
  await Comment.deleteMany({ postId });
  await Reaction.deleteMany({ postId });
  await Notification.deleteMany({ postId });
  await post.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Post deleted successfuly",
  });
});

exports.getCommunityPosts = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req?.user?._id || null;
  const posts = await Post.find({ community: communityId })
    .sort({ createdAt: -1 })
    .populate("createdBy")
    .populate("community", "communityType members")
    .lean();

  const accessiblePosts = filterPostsByAccess(posts, userId);

  const anonymSanitizedPosts = sanitizeAnonym(accessiblePosts);
  const approvedPosts = checkIsPostApproved(anonymSanitizedPosts);

  const filtredPosts = await Promise.all(approvedPosts.map(mapPostWithImages));

  res.status(200).json({
    status: "success",
    filtredPosts,
  });
});

exports.getPendingCommunityPosts = catchAsync(async (req, res, next) => {
  const { communityId } = req.params;
  const userId = req.user._id;

  if (!userId) {
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );
  }

  const community = await Community.findById(communityId);
  if (!community) {
    return next(new AppError("Community not found.", 404));
  }

  const isAdmin = community.admin.includes(userId.toString());
  const isCreator = community.creator.toString() === userId.toString();

  if (!isAdmin && !isCreator) {
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );
  }

  const pendingPosts = await Post.find({
    community: communityId,
    isApproved: false,
  }).populate("createdBy", "nickName");

  res.status(200).json({
    status: "success",
    pendingPosts,
  });
});

exports.approvePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { communityId } = req.body;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError("Post not found", 404));
  if (post.isApproved) return next(new AppError("Post already approved", 409));

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  const isAuthorized =
    community.admin.includes(userId.toString()) ||
    community.creator.toString() === userId.toString();

  if (!isAuthorized)
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );

  post.isApproved = true;
  await post.save();

  res.status(200).json({
    status: "success",
    post,
  });
});

exports.declinePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const { communityId } = req.body;
  const userId = req.user._id;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError("Post not found", 404));

  const community = await Community.findById(communityId);
  if (!community) return next(new AppError("Community not found", 404));

  const isAuthorized =
    community.admin.includes(userId.toString()) ||
    community.creator.toString() === userId.toString();

  if (!isAuthorized)
    return next(
      new AppError("You don't have permission to access this content!", 403)
    );

  if (post.isApproved)
    return next(new AppError("Cannot decline an already approved post", 400));

  await post.deleteOne();

  res.status(200).json({
    status: "success",
    message: "Post deleted successfully",
  });
});

exports.handlePostVotes = catchAsync(async (req, res, next) => {
  const { vote } = req.body;
  const { postId } = req.params;

  const post = await Post.findById(postId);
  if (!post) return next(new AppError("Post not found", 404));

  const votedPost = await post.handleVote(req.user._id, vote);
  res.status(200).json({
    status: "success",
    votedPost,
  });
});

exports.getTopics = catchAsync(async (req, res, next) => {
  const { timeframe } = req.query;
  const limit = 10;

  let dateFilter = {};

  const now = new Date();
  if (timeframe === "Today") {
    dateFilter = { createdAt: { $gte: new Date(now - 24 * 60 * 60 * 1000) } };
  } else if (timeframe === "Week") {
    dateFilter = {
      createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
    };
  } else if (timeframe === "Month") {
    dateFilter = {
      createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
    };
  }

  const posts = await Post.find(dateFilter)
    .limit(limit)
    .populate("createdBy", "nickName")
    .populate("community", "communityType")
    .lean();

  const filteredPosts = posts.filter((post) => {
    return (
      !post.community ||
      post.community.communityType === "Public" ||
      post.community.communityType === "Restricted"
    );
  });

  const sortedPosts = filteredPosts.sort(
    (a, b) =>
      b.upVotes.length -
      b.downVotes.length -
      (a.upVotes.length - a.downVotes.length)
  );

  const postsWithComments = await Promise.all(
    sortedPosts.map(async (post) => {
      post.comments = await Comment.find({ postId: post._id });
      return post;
    })
  );

  const postsWithImgs = await Promise.all(
    postsWithComments.map(async (post) => {
      post.photoUrl = await getImageFromS3(post.media);
      return post;
    })
  );


  res.cookie("test_cookie", "works123", {
    httpOnly: true,      // can't be read by JS
    secure: true,        // must be true in production (HTTPS only)
    sameSite: "none",    // allows cross-origin
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  res.status(200).json({
    status: "success",
    posts: postsWithImgs,
  });
});

exports.getFilteredPosts = catchAsync(async (req, res) => {
  const { category, tags, page = 1, sortBy } = req.query;
  const limit = 10;
  const skip = (page - 1) * limit;

  let query = {};

  if (category && category !== "all") {
    query.category = category;
  }

  if (tags && tags !== "all") {
    const searchTags = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    query.tags = {
      $elemMatch: {
        $regex: searchTags.map((tag) => `\\b${tag}\\b`).join("|"),
        $options: "i",
      },
    };
  }

  const posts = await Post.find(query)
    .sort({ [sortBy]: -1 })
    .skip(skip)
    .limit(limit)
    .populate("community", "communityType")
    .populate("createdBy", "nickName");

  const plainPosts = posts.map((post) => post.toObject());

  const publicPosts = plainPosts.filter(
    (post) => post?.community?.communityType !== "Private"
  );

  const postIds = publicPosts.map((post) => post._id);

  const comments = await Comment.find({ postId: { $in: postIds } });

  const commentsByPost = {};
  comments.forEach((comment) => {
    const key = comment.postId.toString();
    if (!commentsByPost[key]) commentsByPost[key] = [];
    commentsByPost[key].push(comment);
  });

  const postsWithComments = publicPosts.map((post) => {
    post.comments = commentsByPost[post._id.toString()] || [];
    return post;
  });

  const totalPosts = await Post.countDocuments({
    ...query,
  });

  res.status(200).json({
    status: "success",
    page: Number(page),
    totalResults: totalPosts,
    results: postsWithComments.length,
    posts: postsWithComments,
  });
});

exports.popularTags = catchAsync(async (req, res) => {
  const tags = await getMostUsedTags(10);
  res.status(200).json({ tags });
});
