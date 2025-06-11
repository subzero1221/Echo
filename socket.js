const { Server } = require("socket.io");
const Chat = require("./models/chatModel");

const onlineUsers = new Map();
const userChatRooms = new Map();

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`🟢 User connected: ${socket.id}`);

    socket.on("getOnlineUsers", (callback) => {
      const onlineUserIds = [...onlineUsers.keys()];
      callback(onlineUserIds);
    });

    socket.on("userOnline", async (userId) => {
      try {
        onlineUsers.set(userId, socket.id);

        const chats = await Chat.find({ participants: userId });
        chats.forEach((chat) => {
          socket.join(chat._id.toString());
        });

        userChatRooms.set(
          userId,
          new Set(chats.map((chat) => chat._id.toString()))
        );
        console.log(`👤 User ${userId} is online in ${chats.length} chat(s)`);
      } catch (err) {
        console.error("Error joining chat rooms:", err);
      }
    });

    socket.on("forwardMessage", (message) => {
      try {
        io.to(message.chat.toString()).emit("newMessage", message);
        console.log(`📨 Message forwarded to chat ${message.chat}`);
      } catch (err) {
        console.error("Error forwarding message:", err);
      }
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          userChatRooms.delete(userId);
          console.log(`🔴 User ${userId} disconnected`);
          break;
        }
      }
    });
  });
};

const getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
};

const getOnlineUsers = () => onlineUsers;

module.exports = {
  initSocket,
  getIO,
  getOnlineUsers,
};
