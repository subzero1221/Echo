const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Reply = require("../models/replyModel");
const User = require("../models/userModel");
const Comment = require("../models/commentsModel");

exports.addReply = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const { commentId } = req.params;

  console.log("Entering reply!", commentId);

  const newReply = await Reply.create({
    content: content,
    createdBy: req.user._id,
    commentId: commentId,
  });

  console.log("Creating comment!");
  const comment = await Comment.findById(commentId).select("createdBy postId");

  const recipientId = comment.createdBy.toString();

  console.log("REPLIES RECIPIENT:", recipientId);

  req.notificationInfo = {
    recipient: recipientId,
    type: "reply",
    message: `replied on your comment`,
    about: {
      id: newReply._id,
      model: "Reply",
    },
    postId: comment.postId._id,
  };

  next();
});

exports.getReplies = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;

  const replies = await Reply.find({ commentId }).populate("createdBy");

  const replyWithUser = await Promise.all(
    replies.map(async (reply) => {
      const userImage = await reply.createdBy.getImageUrl();
    })
  );

  res.status(200).json({
    status: "success",
    replies,
  });
});

exports.deleteReply = catchAsync(async (req, res, next) => {
  const { replyId } = req.params;

  const reply = await Reply.findById(replyId);
  if (!reply) {
    return res.status(404).json({
      status: "fail",
      message: "Reply not found",
    });
  }
  if (reply.createdBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      status: "fail",
      message: "You are not authorized to delete this reply",
    });
  }

  await Reply.findByIdAndDelete(replyId);

  res.status(200).json({
    status: "success",
    message: "Reply deleted successfully",
  });
});
