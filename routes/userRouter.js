const express = require("express");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const {
  updateProfileData,
  updatePassword,
  uploadUserAvatar,
  getUserAvatar,
  getUserCommunities,
  getOtherUserPosts,
  getOtherUserComments,
  getOtherUserData,
  getOtherUserShares,
} = require("../controllers.js/userController");
const { checkAuth } = require("../controllers.js/authController");

const router = express.Router();

router.post("/updateProfileData", checkAuth, updateProfileData);
router.post("/updatePassword", checkAuth, updatePassword);
router.post(
  "/uploadUserAvatar",
  checkAuth,
  upload.single("photo"),
  uploadUserAvatar
);

router.get("/getUserCommunities", checkAuth, getUserCommunities);
router.get("/getUserAvatar", checkAuth, getUserAvatar);

//Other users data//

router.get("/:userId/posts", getOtherUserPosts);
router.get("/:userId/comments", getOtherUserComments);
router.get("/:userId/shares", getOtherUserShares);
router.get("/:userId/getUserData", getOtherUserData);

module.exports = router;
