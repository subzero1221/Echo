const express = require("express");
const { checkAuth } = require("../controllers.js/authController");
const {
  savePost,
  getSavedPosts,
  deleteSave,
} = require("../controllers.js/saveController");

const router = express.Router();

router.post("/savePost/:postId", checkAuth, savePost);

router.get("/getSavedPosts", checkAuth, getSavedPosts);

router.delete("/deleteSave/:postId", checkAuth, deleteSave);

module.exports = router;
