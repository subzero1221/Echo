const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const catchAsync = require("../utils/catchAsync");
const mongoose = require("mongoose");

exports.getRecentChats = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = page === 1 ? 7 : 10;
  const skip = page === 1 ? 0 : 7 + (page - 2) * 10;

  const recentChats = await Chat.aggregate([
    // 1. Match user's chats
    { $match: { participants: new mongoose.Types.ObjectId(userId) } },

    // 2. Sort by most recent
    { $sort: { updatedAt: -1 } },

    // 3. Pagination
    { $skip: skip },
    { $limit: limit },

    // 4. Join ALL messages for unread count calculation
    {
      $lookup: {
        from: "messages",
        localField: "_id",
        foreignField: "chat",
        as: "allMessages",
      },
    },

    // 5. Join just the last message
    {
      $lookup: {
        from: "messages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessage",
      },
    },
    { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

    // 6. Join participant info with FULL population
    {
      $lookup: {
        from: "users",
        let: { participants: "$participants" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$_id", "$$participants"] },
                  { $ne: ["$_id", new mongoose.Types.ObjectId(userId)] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              nickName: 1,
              avatar: 1,
              lastSeen: 1, // Add any other fields you need
              // Add more user fields as needed
            },
          },
        ],
        as: "otherParticipantInfo",
      },
    },
    {
      $unwind: {
        path: "$otherParticipantInfo",
        preserveNullAndEmptyArrays: true,
      },
    },

    // 7. Calculate unread count
    {
      $addFields: {
        unreadCount: {
          $size: {
            $filter: {
              input: "$allMessages",
              as: "msg",
              cond: {
                $and: [
                  { $eq: ["$$msg.isRead", false] },
                  {
                    $ne: ["$$msg.sender", new mongoose.Types.ObjectId(userId)],
                  },
                ],
              },
            },
          },
        },
      },
    },

    // 8. Project final fields
    {
      $project: {
        _id: 1,
        updatedAt: 1,
        lastMessage: {
          content: 1,
          createdAt: 1,
          isRead: 1,
          // Include any other message fields you need
        },
        otherParticipant: "$otherParticipantInfo", // Now contains full user object
        unreadCount: 1,
      },
    },
  ]);

  const processedRecentChats = await Promise.all(
    recentChats.map(async (chat) => {
      if (chat.otherParticipant.avatar !== "userDefault.jpg") {
        const User = mongoose.model("User");
        const userDoc = await User.findById(chat.otherParticipant._id);
        if (userDoc) {
          await userDoc.getImageUrl();
          chat.otherParticipant.avatarUrl = userDoc.avatarUrl;
        }
      }
      return chat;
    })
  );

  const totalChats = await Chat.countDocuments({ participants: userId });
  const hasMore = skip + limit < totalChats;

  res.status(200).json({
    status: "success",
    results: recentChats.length,
    hasMore,
    processedRecentChats,
  });
});

exports.startChat = catchAsync(async (req, res, next) => {
  const participants = [
    req.user._id.toString(),
    req.params.recipientId.toString(),
  ];

  let chat = await Chat.findOne({
    participants: { $all: participants },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!chat) {
    chat = await Chat.create({ participants });
  }

  res.status(200).json({
    status: "success",
    chat,
  });
});
