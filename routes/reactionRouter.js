const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  addReaction,
  getReactions,
} = require("../controllers.js/reactionController");
const {
  sendNotification,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.post("/addReaction/:postId", checkAuth, addReaction, sendNotification);
router.get("/getReactions/:postId", getReactions);

module.exports = router;
