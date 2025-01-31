const WebSocket = require("ws");
const http = require("http");
const axios = require("axios");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { Server } = require("socket.io");

const port = 4500;

// Message Types
const MessageTypes = {
  CHAT: "chat",
  VOICE_STATE: "voice_state",
  USER_STATUS: "user_status",
  CHANNEL_JOIN: "channel_join",
  CHANNEL_LEAVE: "channel_leave",
  USER_JOIN: "user_join",
  USER_LEAVE: "user_leave",
  FETCH: "fetch",
};

// User Sessions
const userSessions = new Map();

// HTTP Server with CORS
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  res.end("RC WebSocket Server");
});

// // WebSocket Server
// const wss = new WebSocket.Server({
//   server,
// });

// // Broadcast to all clients in a channel
// const broadcastToChannel = (channelId, message, excludeClient = null) => {
//   wss.clients.forEach((client) => {
//     if (
//       client.readyState === WebSocket.OPEN &&
//       client.channelId === channelId &&
//       client !== excludeClient
//     ) {
//       client.send(JSON.stringify(message));
//     }
//   });
// };

// // Handle user connection
// const handleUserConnect = async (ws, userId, channelId) => {
//   ws.userId = userId;
//   ws.channelId = channelId;
//   userSessions.set(userId, ws);

//   // Load user data
//   const userData = await db.get(`user_${userId}`);
//   if (userData) {
//     ws.userData = userData;
//   }

//   // Notify channel members
//   broadcastToChannel(
//     channelId,
//     {
//       type: MessageTypes.USER_JOIN,
//       data: {
//         userId,
//         channelId,
//         timestamp: Date.now(),
//       },
//     },
//     ws
//   );
// };

// // Handle user disconnect
// const handleUserDisconnect = (ws) => {
//   if (ws.userId && ws.channelId) {
//     userSessions.delete(ws.userId);
//     broadcastToChannel(ws.channelId, {
//       type: MessageTypes.USER_LEAVE,
//       data: {
//         userId: ws.userId,
//         channelId: ws.channelId,
//         timestamp: Date.now(),
//       },
//     });
//   }
// };

// // Message Handlers
// const messageHandlers = {
//   [MessageTypes.CHAT]: async (ws, data) => {
//     const message = {
//       type: MessageTypes.CHAT,
//       data: {
//         userId: ws.userId,
//         channelId: ws.channelId,
//         content: data.content,
//         timestamp: Date.now(),
//       },
//     };

//     // Store message in database
//     await db.push(`channel_${ws.channelId}_messages`, message);

//     // Broadcast to channel
//     broadcastToChannel(ws.channelId, message);
//   },

//   [MessageTypes.VOICE_STATE]: async (ws, data) => {
//     const voiceState = {
//       type: MessageTypes.VOICE_STATE,
//       data: {
//         userId: ws.userId,
//         channelId: ws.channelId,
//         isSpeaking: data.isSpeaking,
//         isMuted: data.isMuted,
//         timestamp: Date.now(),
//       },
//     };

//     // Update voice state in database
//     await db.set(`user_${ws.userId}_voice`, voiceState.data);

//     // Broadcast to channel
//     broadcastToChannel(ws.channelId, voiceState);
//   },

//   [MessageTypes.USER_STATUS]: async (ws, data) => {
//     const status = {
//       type: MessageTypes.USER_STATUS,
//       data: {
//         userId: ws.userId,
//         status: data.status,
//         timestamp: Date.now(),
//       },
//     };

//     // Update user status
//     await db.set(`user_${ws.userId}_status`, status.data);

//     // Broadcast to all users
//     wss.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify(status));
//       }
//     });
//   },

//   [MessageTypes.CHANNEL_JOIN]: async (ws, data) => {
//     const oldChannelId = ws.channelId;
//     const newChannelId = data.channelId;

//     // Leave old channel
//     if (oldChannelId) {
//       broadcastToChannel(oldChannelId, {
//         type: MessageTypes.CHANNEL_LEAVE,
//         data: {
//           userId: ws.userId,
//           channelId: oldChannelId,
//           timestamp: Date.now(),
//         },
//       });
//     }

//     // Join new channel
//     ws.channelId = newChannelId;
//     broadcastToChannel(newChannelId, {
//       type: MessageTypes.CHANNEL_JOIN,
//       data: {
//         userId: ws.userId,
//         channelId: newChannelId,
//         timestamp: Date.now(),
//       },
//     });
//   },

//   [MessageTypes.FETCH]: async (ws, data) => {
//     try {
//       const response = await axios.get(data.url, {
//         headers: {
//           Authorization: data.token,
//         },
//       });
//       ws.send(
//         JSON.stringify({
//           type: "response",
//           data: response.data,
//         })
//       );
//     } catch (error) {
//       ws.send(
//         JSON.stringify({
//           type: "error",
//           error: error.message,
//         })
//       );
//     }
//   },
// };

// // WebSocket Connection Handler
// wss.on("connection", async (ws, req) => {
//   // Authentication (you should implement proper auth)
//   const userId = req.headers["user-id"];
//   const channelId = req.headers["channel-id"];

//   if (!userId || !channelId) {
//     ws.close(4000, "Missing authentication");
//     return;
//   }

//   // Initialize user connection
//   await handleUserConnect(ws, userId, channelId);

//   // Message Handler
//   ws.on("message", async (message) => {
//     try {
//       const { type, data } = JSON.parse(message);
//       console.log("Received message:", type, data);

//       // Rate limiting (implement proper rate limiting)
//       if (type === MessageTypes.CHAT) {
//         const lastMessageTime = ws.lastMessageTime || 0;
//         const currentTime = Date.now();
//         if (currentTime - lastMessageTime < 250) {
//           ws.send(
//             JSON.stringify({
//               type: "error",
//               error: "Rate limit exceeded",
//             })
//           );
//           return;
//         }
//         ws.lastMessageTime = currentTime;
//       }

//       // Handle message
//       const handler = messageHandlers[type];
//       if (handler) {
//         await handler(ws, data);
//       }
//     } catch (error) {
//       console.error("Message handling error:", error);
//       ws.send(
//         JSON.stringify({
//           type: "error",
//           error: error.message,
//         })
//       );
//     }
//   });

//   // Disconnection Handler
//   ws.on("close", () => {
//     handleUserDisconnect(ws);
//   });
// });

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("meow");
  socket.on("disconnect", () => {});

  socket.on("join", (username) => {});
});

// Error Handling
server.on("error", (error) => {
  console.error("Server error:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled rejection:", error);
});

// Start Server
server.listen(port, () => {
  console.log(`RC WebSocket Server running on ws://localhost:${port}`);
});
