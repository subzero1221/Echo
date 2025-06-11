const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/AppError");
const Comment = require("../models/commentsModel");
const User = require("../models/userModel");
const Reply = require("../models/replyModel");
const Post = require("../models/postModel");

exports.addComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const { postId } = req.params;
  console.log(content);

  const newComment = await Comment.create({
    content: content,
    createdBy: req.user._id,
    postId: postId,
  });

  const post = await Post.findById(postId).select("createdBy");

  if (!post) return next(new AppError("Post not found!", 404));

  const recipientId = post.createdBy.toString();

  req.notificationInfo = {
    recipient: recipientId,
    type: "comment",
    message: `leaved comment on your post`,
    about: {
      id: newComment._id,
      model: "Comment",
    },
    postId,
  };

  next();
});

exports.getComments = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const comments = await Comment.find({ postId })
    .populate("createdBy")
    .sort({ upVotes: -1, createdAt: -1 });

  const commentsWithUser = await Promise.all(
    comments.map(async (comment) => {
      const userImage = await comment.createdBy.getImageUrl();
    })
  );

  res.status(200).json({
    status: "success",
    comments,
  });
});

exports.getComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId).populate("createdBy");
  console.log(comment);

  const commentWithUser = await comment.createdBy.getImageUrl();

  res.status(200).json({
    status: "success",
    comment,
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    return res.status(404).json({
      status: "fail",
      message: "Comment not found",
    });
  }
  if (comment.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      status: "fail",
      message: "You are not authorized to delete this comment",
    });
  }

  await Reply.deleteMany({ commentId });
  await Comment.findByIdAndDelete(commentId);

  res.status(200).json({
    status: "success",
    message: "Comment deleted successfully",
  });
});

exports.handleCommentVotes = catchAsync(async (req, res, next) => {
  const { vote } = req.body;
  const { commentId } = req.params;
  console.log("Registring votes", vote, commentId);

  const comment = await Comment.findById(commentId);
  if (!comment) return next(new AppError("Post not found", 404));

  const votedComment = await comment.handleVote(req.user._id, vote);
  res.status(200).json({
    status: "success",
    votedComment,
  });
});
