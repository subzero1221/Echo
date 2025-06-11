const express = require("express");
const {
  addComment,
  getComments,
  deleteComment,
  handleCommentVotes,
  getComment,
} = require("../controllers.js/commentController");
const { checkAuth } = require("../controllers.js/authController");
const {
  sendNotification,
} = require("../controllers.js/notificationController");

const router = express.Router();

router.post("/addComment/:postId", checkAuth, addComment, sendNotification);
router.get("/getComments/:postId", getComments);
router.get("/getComment/:commentId", getComment);
router.delete("/deleteComment/:commentId", checkAuth, deleteComment);
router.patch("/handleVotes/:commentId", checkAuth, handleCommentVotes);

module.exports = router;
