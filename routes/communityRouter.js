const express = require("express");
const multer = require("multer");
const { checkAuth } = require("../controllers.js/authController");
const {
  createCommunity,
  getCommunity,
  uploadCommunityPhoto,
  uploadCommunityCoverPhoto,
  deleteCommunity,
  joinCommunity,
  answerUserRequest,
  adminAction,
  removeMember,
  leaveCommunity,
  addCommunityRule,
  deleteCommunityRule,
} = require("../controllers.js/communityController");

const {
  sendNotification,
} = require("../controllers.js/notificationController");

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.post("/createCommunity", checkAuth, createCommunity);
router.post(
  "/uploadCommunityPhoto/:communityId",
  checkAuth,
  upload.single("photo"),
  uploadCommunityPhoto
);
router.post(
  "/uploadCommunityCoverPhoto/:communityId",
  checkAuth,
  upload.single("photo"),
  uploadCommunityCoverPhoto
);

router.get("/getCommunity/:communityId", getCommunity);

router.patch("/joinCommunity/:communityId", checkAuth, joinCommunity);
router.post("/leaveCommunity/:communityId", checkAuth, leaveCommunity);
router.post(
  "/answerUserRequest/:communityId",
  checkAuth,
  answerUserRequest,
  sendNotification
);

router.post(
  "/adminAction/:communityId",
  checkAuth,
  adminAction,
  sendNotification
);

router.post("/addCommunityRule/:communityId", checkAuth, addCommunityRule);
router.post(
  "/deleteCommunityRule/:communityId",
  checkAuth,
  deleteCommunityRule
);

router.delete("/removeMember/:communityId", checkAuth, removeMember);
router.delete("/deleteCommunity/:communityId", checkAuth, deleteCommunity);

module.exports = router;
