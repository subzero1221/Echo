const User = require("./../models/userModel");
const Friend = require("./../models/friendModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const Notification = require("../models/notificationModel");

exports.sendFriendRequest = catchAsync(async (req, res, next) => {
  const { recipientId } = req.params;
  const requesterId = req.user._id;

  const existingRequest = await Friend.findOne({
    recipient: recipientId,
    requester: requesterId,
  });

  if (existingRequest) {
    return next(new AppError("Friend request already sent", 400));
  }

  const friendRequest = await Friend.create({
    recipient: recipientId,
    requester: requesterId,
  });

  req.notificationInfo = {
    message: `sent you a friend request`,
    recipient: friendRequest.recipient,
    type: "friend_request",
    about: {
      id: friendRequest._id,
      model: "Friend",
    },
  };

  next();
});

exports.acceptFriendRequest = catchAsync(async (req, res, next) => {
  const recipientId = req.user._id;
  const { requesterId } = req.params;

  const friendRequest = await Friend.findOne({
    recipient: recipientId,
    requester: requesterId,
  }).populate("requester");

  if (!friendRequest) {
    return next(new AppError("Friend request not found", 404));
  }

  if (friendRequest.status === "accepted")
    return next(new AppError("You are already friends"));

  friendRequest.status = "accepted";
  await friendRequest.save();

  const notification = await Notification.findOne({
    sender: requesterId,
    recipient: recipientId,
    type: "friend_request",
  });

  notification.type = "accepted_friend_request";
  notification.isRead = true;
  await notification.save();

  req.notificationInfo = {
    message: `accepted your friend request`,
    recipient: friendRequest.requester,
    type: "accepted_friend_request",
    about: {
      id: friendRequest._id,
      model: "Friend",
    },
  };

  next();
});

exports.declineFriendRequest = catchAsync(async (req, res, next) => {
  const recipientId = req.user._id;
  const { requesterId } = req.params;

  const friendRequest = await Friend.findOne({
    recipient: recipientId,
    requester: requesterId,
  });

  if (!friendRequest) {
    return next(new AppError("Friend request not found", 404));
  }

  await friendRequest.deleteOne();

  const notification = await Notification.findOne({
    sender: requesterId,
    recipient: recipientId,
    type: "friend_request",
  });

  notification.type = "declined_friend_request";
  notification.isRead = true;
  await notification.save();

  req.notificationInfo = {
    message: `declined your friend request`,
    recipient: friendRequest.requester,
    type: "declined_friend_request",
    about: {
      id: friendRequest._id,
      model: "Friend",
    },
  };

  next();
});

exports.getFriends = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  const friends = await Friend.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  }).populate("requester recipient");

  console.log("Friends:", friends);

  const myFriends = friends.map((friend) => {
    const isRequester = friend.requester._id.toString() === userId.toString();
    return isRequester ? friend.recipient : friend.requester;
  });

  console.log("My friends :", myFriends);

  res.status(200).json({
    status: "success",
    myFriends,
  });
});

exports.getRelationship = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const { recipientId } = req.params;

  const relationship = await Friend.findOne({
    $or: [
      { requester: userId, recipient: recipientId },
      { requester: recipientId, recipient: userId },
    ],
  });

  let relationshipType = null;

  if (relationship) {
    if (relationship.status === "accepted") {
      relationshipType = "friends";
    } else if (String(relationship.requester) === String(userId)) {
      relationshipType = "sent";
    } else {
      relationshipType = "received";
    }
  }

  res.status(200).json({
    status: "success",
    relationship,
    relationshipType,
  });
});
