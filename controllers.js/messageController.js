const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { getIO } = require("../socket");
const catchAsync = require("../utils/catchAsync");
const mongoose = require("mongoose");
const {
  uploadImageToS3,
  uploadVideoToS3,
  getVideoFromS3,
  getImageFromS3,
} = require("../utils/fileHandler");

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { recipientId, content } = req.body;
  const senderId = req.user.id;
  const io = getIO();
  const file = req?.file || null;

  let fileName = null;
  let fileType = null;
  let fileUrl = null;

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
    fileUrl = isVideo
      ? await getVideoFromS3(fileName)
      : await getImageFromS3(fileName);
  }

  let chat = await Chat.findOne({
    participants: { $all: [senderId, recipientId] },
  });

  if (!chat) {
    chat = await Chat.create({ participants: [senderId, recipientId] });
  }

  const message = await Message.create({
    chat: chat._id,
    sender: senderId,
    content,
    file: fileName,
    fileType,
  });

  chat.lastMessage = message._id;
  chat.updatedAt = new Date();
  await chat.save();

  io.to(chat._id.toString()).emit("newMessage", {
    ...message.toObject(),
    fileUrl,
  });

  res.status(201).json({
    success: true,
    message: { ...message.toObject(), fileUrl },
  });
});

exports.getMessages = catchAsync(async (req, res, next) => {
  const { chatId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  console.log("FetchingMessages:", chatId, userId, page);

  let messages = await Message.find({ chat: chatId })
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
    .limit(pageSize + 1)
    .populate("sender", "name avatar")
    .lean();

  const hasMore = messages.length > pageSize;
  if (hasMore) messages.pop();

  messages.reverse();

  const unreadIds = messages
    .filter(
      (msg) => !msg.isRead && msg.sender._id.toString() !== userId.toString()
    )
    .map((msg) => msg._id);

  if (unreadIds.length > 0) {
    await Message.updateMany(
      { _id: { $in: unreadIds } },
      { $set: { isRead: true } }
    );

    messages = messages.map((msg) =>
      unreadIds.includes(msg._id) ? { ...msg, isRead: true } : msg
    );
  }

  const messagesWithFiles = await Promise.all(
    messages.map(async (msg) => {
      if (msg.file) {
        try {
          const fileUrl =
            msg.fileType === "video"
              ? await getVideoFromS3(msg.file)
              : await getImageFromS3(msg.file);
          return { ...msg, fileUrl };
        } catch (error) {
          console.error("Failed to fetch media from S3:", error);
          return { ...msg, fileUrl: null };
        }
      }

      return { ...msg, fileUrl: null };
    })
  );

  console.log(
    "ReturningMessages:",
    messagesWithFiles.map((m) => m)
  );

  res.status(200).json({
    status: "success",
    messages: messagesWithFiles,
    hasMore,
  });
});
