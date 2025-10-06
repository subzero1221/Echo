// server.js
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const http = require("http");
const globalErrorHandler = require("./controllers.js/errorController");

const {
  initSocket, // ✅ Import socket initializer
} = require("./socket"); // ✅ USE THE NEW MODULE

const authRouter = require("./routes/authRouter");
const userRouter = require("./routes/userRouter");
const postRouter = require("./routes/postRouter");
const commentRouter = require("./routes/commentRouter");
const replyRouter = require("./routes/replyRouter");
const reactionRouter = require("./routes/reactionRouter");
const communityRouter = require("./routes/communityRouter");
const saveRouter = require("./routes/saveRouter");
const shareRouter = require("./routes/shareRouter");
const friendRouter = require("./routes/friendRouter");
const notificationRouter = require("./routes/notificationRouter");
const messageRouter = require("./routes/messageRouter");
const chatRouter = require("./routes/chatRouter");

dotenv.config({ path: ".env" });

const port = process.env.PORT;
const DB = process.env.MONGODB_URL;

const app = express();
const server = http.createServer(app); // ⬅️ Use raw HTTP server

initSocket(server); // ✅ Start socket server before everything

app.use(express.json());
console.log("CORS origin on Render:", process.env.FRONTEND_URL);
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose
  .connect(DB, {})
  .then(() => console.log("✅ Database connected!"))
  .catch((err) => console.error(`❌ Database connection error: ${err}`));

app.use("/test", (req, res, next) => {
  console.log("Incoming request:", req.method, req.url);
  res.status(200).json({ status: "seucces", test: "In action" });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/replies", replyRouter);
app.use("/api/v1/reactions", reactionRouter);
app.use("/api/v1/communities", communityRouter);
app.use("/api/v1/saves", saveRouter);
app.use("/api/v1/shares", shareRouter);
app.use("/api/v1/friends", friendRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/messages", messageRouter);
app.use("/api/v1/chats", chatRouter);

app.use(globalErrorHandler);

server.listen(port, () => {
  console.log(`🚀 Server is running on PORT ${port}`);
});
