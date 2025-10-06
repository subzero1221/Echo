const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const { getImageFromS3 } = require("../utils/fileHandler");
const Notification = require("./../models/notificationModel");
const { getIO, getOnlineUsers } = require("../socket");
const Reply = require("../models/replyModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentsModel");
const Reaction = require("../models/reactionModel");

exports.sendNotification = catchAsync(async (req, res, next) => {
  const { recipient, type, message, about, postId } = req.notificationInfo;
  const sender = req.user._id;
  console.log(
    "Recipient ID:",
    recipient.toString(),
    "senderID:",
    sender.toString()
  );

  if (recipient.toString() === sender.toString()) {
    return res.status(200).json({
      status: "success",
    });
  }

  const io = getIO();
  const onlineUsers = getOnlineUsers();

  await Notification.create({
    recipient,
    sender,
    type,
    about,
    message,
    postId,
  });

  if (onlineUsers.has(recipient)) {
    const socketId = onlineUsers.get(recipient);
    io.to(socketId).emit("newNotification", {
      type,
      from: sender,
      message,
      extra,
    });
    console.log(`📡 Real-time notification sent to ${recipient}`);
  }

  res.status(200).json({
    status: "success",
    message: message,
  });
});

exports.getNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { filter = "all", page = 1, limit = 10 } = req.query;

  const query = { recipient: userId };

  if (filter !== "all") {
    query.type = filter;
  }

  const totalNotifications = await Notification.countDocuments(query);

  const notifications = await Notification.find(query)
    .sort({ isRead: 1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(+limit)
    .populate("sender");

  const notificationsWithExtraData = await Promise.all(
    notifications.map(async (notification) => {
      const { model, id } = notification.about;

      const avatarUrl = await getImageFromS3(notification.sender?.avatar);
      notification.sender.avatarUrl = avatarUrl;

      let aboutData = null;

      switch (model) {
        case "Post":
          aboutData = await Post.findById(id).select("_id title");
          break;
        case "Comment":
          aboutData = await Comment.findById(id)
            .select("_id content")
            .populate("postId", "title");
          break;
        case "Reaction":
          aboutData = await Reaction.findById(id)
            .select("_id content")
            .populate("postId", "_id title");
          break;
        case "Reply":
          aboutData = await Reply.findById(id)
            .select("_id content commentId")
            .populate({
              path: "commentId",
              select: "_id postId content",
              populate: { path: "postId", select: "_id title" },
            });
          break;
      }

      return {
        ...notification.toObject(),
        aboutData,
      };
    })
  );

  res.status(200).json({
    status: "success",
    notificationsWithExtraData,
    totalPages: Math.ceil(totalNotifications / limit),
  });
});

exports.getNotificationsLength = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ recipient: userId });
  if (!notifications) return next(new AppError("Notifications not found", 404));

  res.status(200).json({
    notifications,
  });
});

exports.markNotifiationAsRead = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;
  const notification = await Notification.findById(notificationId);
  if (!notification)
    return next(new AppError("Notification doesnt exist", 404));
  if (notification.isRead)
    return next(new AppError("Notification is already checked", 200));
  notification.isRead = true;
  await notification.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Notification is read successfuly",
  });
});
