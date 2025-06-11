const express = require("express");
const multer = require("multer");
const { checkAuth } = require("../controllers.js/authController");
const {
  getUserRecentChats,
  sendMessage,
  getMessages,
} = require("../controllers.js/messageController");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/getMessages/:chatId", checkAuth, getMessages);

router.post("/sendMessage", checkAuth, upload.single("media"), sendMessage);

module.exports = router;
