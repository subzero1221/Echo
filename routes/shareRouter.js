const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  sharePost,
  getSharedPosts,
  deleteShare,
} = require("../controllers.js/shareController");
const {
  sendNotification,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.post("/sharePost/:postId", checkAuth, sharePost, sendNotification);

router.get("/getSharedPosts", checkAuth, getSharedPosts);

router.delete("/deleteShare/:postId", checkAuth, deleteShare);

module.exports = router;
