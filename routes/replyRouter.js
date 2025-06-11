const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  addReply,
  getReplies,
  deleteReply,
} = require("../controllers.js/replyController");
const {
  sendNotification,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.post("/addReply/:commentId", checkAuth, addReply, sendNotification);
router.get("/getReplies/:commentId", getReplies);
router.delete("/deleteReply/:replyId", checkAuth, deleteReply);

module.exports = router;
