const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  getNotifications,
  markNotifiationAsRead,
  getNotificationsLength,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.get(`/getNotifications`, checkAuth, getNotifications);
router.get(`/getNotificationsLength`, checkAuth, getNotificationsLength);

router.post("/markNotificationAsRead/:notificationId", markNotifiationAsRead);

module.exports = router;
