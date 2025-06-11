const express = require("express");
const {
  signup,
  signin,
  signout,
  checkAuth,
  forgotPassword,
  resetPassword,
} = require("../controllers.js/authController");

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);
router.post("/forgotPassword", forgotPassword);
router.post("/resetPassword/:resetToken", resetPassword);
router.get("/checkAuth", checkAuth);

module.exports = router;
