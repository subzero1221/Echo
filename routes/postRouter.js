const express = require("express");
const multer = require("multer");
const { checkAuth, checkStatus } = require("../controllers.js/authController");
const {
  createPost,
  getPosts,
  handlePostVotes,
  getCommunityPosts,
  deletePost,
  getTopics,
  getFilteredPosts,
  popularTags,
  getPendingCommunityPosts,
  approvePost,
  declinePost,
} = require("../controllers.js/postController");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/createPost", checkAuth, upload.single("photo"), createPost);
router.get("/getPosts/:postId?", checkStatus, getPosts);
router.get("/getCommunityPosts/:communityId", checkStatus, getCommunityPosts);
router.get(
  "/getPendingCommunityPosts/:communityId",
  checkAuth,
  getPendingCommunityPosts
);
router.post("/approvePost/:postId", checkAuth, approvePost);
router.delete("/declinePost/:postId", checkAuth, declinePost);
router.get("/getTopics", getTopics);
router.get("/getfiltredPosts", getFilteredPosts);
router.get("/popularTags", popularTags);
router.patch("/handleVotes/:postId", checkAuth, handlePostVotes);
router.delete("/deletePost/:postId", checkAuth, deletePost);

module.exports = router;
