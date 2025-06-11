const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  getRecentChats,
  startChat,
} = require("../controllers.js/chatController");

const router = express.Router();

router.get("/getRecentChats", checkAuth, getRecentChats);

router.post("/startChat/:recipientId", checkAuth, startChat);

module.exports = router;
