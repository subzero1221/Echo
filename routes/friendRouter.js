const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  sendFriendRequest,
  getFriends,
  getRelationship,
  acceptFriendRequest,
  declineFriendRequest,
} = require("../controllers.js/friendController");
const {
  sendNotification,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.get("/getFriends", checkAuth, getFriends);

router.post(
  "/sendFriendRequest/:recipientId",
  checkAuth,
  sendFriendRequest,
  sendNotification
);
router.post(
  "/acceptFriendRequest/:requesterId",
  checkAuth,
  acceptFriendRequest,
  sendNotification
);

router.post(
  "/declineFriendRequest/:requesterId",
  checkAuth,
  declineFriendRequest,
  sendNotification
);

router.get("/getFriends", checkAuth, getFriends);
router.get("/getRelationship/:recipientId", checkAuth, getRelationship);

module.exports = router;
