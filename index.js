const http = require("http");
const { QuickDB } = require("quick.db");
const db = new QuickDB();
const { Server } = require("socket.io");
const chalk = require("chalk");
const { v4: uuidv4 } = require("uuid");

// Logger
class Logger {
  constructor(origin) {
    this.origin = origin;
  }
  info(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.cyan(
        `[${this.origin}]`
      )} ${message}`
    );
  }
  command(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.hex("#F3CCF3")(
        `[${this.origin}]`
      )} ${message}`
    );
  }
  success(message) {
    console.log(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.green(
        `[${this.origin}]`
      )} ${message}`
    );
  }
  warn(message) {
    console.warn(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.yellow(
        `[${this.origin}]`
      )} ${message}`
    );
  }
  error(message) {
    console.error(
      `${chalk.gray(new Date().toLocaleString())} ${chalk.red(
        `[${this.origin}]`
      )} ${message}`
    );
  }
}

const port = 4500;
const CONTENT_TYPE_JSON = { "Content-Type": "application/json" };

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

// Send Error/Success Response
const sendError = (res, statusCode, message) => {
  res.writeHead(statusCode, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ error: message }));
};

const sendSuccess = (res, data) => {
  res.writeHead(200, CONTENT_TYPE_JSON);
  res.end(JSON.stringify(data));
};

// HTTP Server with CORS
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS, PATCH");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, ngrok-skip-browser-warning"
  );

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "PATCH" && req.url === "/userData") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        // 驗證必填欄位
        if (!data.name) {
          sendError(res, 400, "名稱為必填");
          return;
        }

        // 從資料庫獲取用戶列表
        const usersList = (await db.get(`usersList`)) || {};

        // 找到要更新的用戶
        if (!usersList[data.userId]) {
          sendError(res, 404, "找不到此用戶");
          return;
        }

        // 更新用戶資料
        usersList[data.userId] = {
          ...usersList[data.userId],
          name: data.name,
          gender: data.gender,
        };

        // 儲存回資料庫
        await db.set(`usersList`, usersList);

        new Logger("User").success(`User updated: ${data.userId}`);

        // 返回成功
        sendSuccess(res, {
          message: "更新成功",
          user: {
            id: data.userId,
            name: data.name,
            gender: data.gender,
            account: usersList[data.userId].account,
          },
        });
      } catch (error) {
        new Logger("User").error(`Update error: ${error.message}`);
        sendError(res, 500, "更新失敗");
      }
    });
    return;
  }

  if (req.method == "POST" && req.url == "/login") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        // Validate required fields
        if (!data.account || !data.password) {
          sendError(res, 400, "Missing credentials");
          return;
        }

        // Get user from database
        const usersList = (await db.get(`usersList`)) || {};
        const user = Object.values(usersList).find(
          (user) => user.account === data.account
        );

        if (!user) {
          sendError(res, 401, "找不到此帳號");
          return;
        }

        // Verify password
        if (user.password !== data.password) {
          sendError(res, 401, "密碼錯誤");
          return;
        }

        // Generate session token
        // const sessionToken = uuidv4();
        // userSessions.set(sessionToken, user.id);

        new Logger("Auth").success(`User logged in: ${data.account}`);

        // Return success with user info and token
        const { password, ...userInfo } = user;
        sendSuccess(res, {
          message: "Login successful",
          user: {
            id: userInfo.id,
            name: userInfo.name,
            account: userInfo.account,
            gender: userInfo.gender,
          },
          // token: sessionToken,
        });
      } catch (error) {
        new Logger("Auth").error(`Login error: ${error.message}`);
        sendError(res, 500, "Login failed");
      }
    });
  }

  if (req.method == "POST" && req.url == "/register") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const data = JSON.parse(body);

        // Validate required fields
        if (!data.account || !data.password || !data.username) {
          sendError(res, 400, "Missing required fields");
          return;
        }

        // Check if account already exists
        const usersList = (await db.get(`usersList`)) || {};
        const existingUser = Object.values(usersList).find(
          (user) => user.account === data.account
        );
        if (existingUser) {
          sendError(res, 409, "此帳號已被註冊");
          return;
        }

        // Create new user
        const userId = uuidv4();
        const user = {
          id: userId,
          name: data.username,
          account: data.account,
          password: data.password, // Note: In production, hash the password!
          gender: data.gender,
          permissions: {},
        };

        const newUsersList = (await db.get(`usersList`)) || {};
        newUsersList[userId] = user;
        await db.set(`usersList`, newUsersList);

        // Add to usersList
        usersList[userId] = {
          name: user.name,
          id: userId,
          gender: user.gender,
          permissions: user.permissions,
        };

        new Logger("Auth").success(`New user registered: ${data.account}`);

        // Return success with user info (excluding password)
        const { password, ...userInfo } = user;
        sendSuccess(res, {
          message: "Registration successful",
          user: userInfo,
        });
      } catch (error) {
        new Logger("Auth").error(`Registration error: ${error.message}`);
        sendError(res, 500, "Registration failed");
      }
    });
  }
});

const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {});

  socket.on("connectServer", async (data) => {
    try {
      const usersList = (await db.get(`usersList`)) || {};
      const channelList = (await db.get("channelList")) || {};
      const messageList = (await db.get("messageList")) || {};
      const serverList = (await db.get("serverList")) || {};

      if (!data.serverId || !data.userId) {
        new Logger("WebSocket").error(`Invalid server data`);
        socket.emit("error", { message: `Invalid server data` });
        return;
      }
      const server = serverList[data.serverId];
      if (!server) {
        new Logger("WebSocket").error(`Server(${data.serverId}) not found`);
        socket.emit("error", {
          message: `Server(${data.serverId}) not found`,
        });
        return;
      }
      const user = usersList[data.userId];
      if (!server) {
        new Logger("WebSocket").error(`User(${data.userId}) not found`);
        socket.emit("error", {
          message: `User(${data.userId}) not found`,
        });
        return;
      }

      if (!server.users.includes(user.id)) {
        server.users.push(user.id);
        user.permissions[server.id] = 1;
      }
      await db.set("serverList", serverList);
      await db.set("usersList", usersList);

      const channels = server.channels
        .map((channelId) => channelList[channelId])
        .filter((_) => _);
      const messages = server.messages
        .map((messageId) => messageList[messageId])
        .filter((_) => _);
      const users = server.users
        .map((userId) => usersList[userId])
        .filter((_) => _)
        .reduce((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
      socket.join(`server_${server.id}`);
      socket.emit("serverData", {
        server,
        channels,
        messages,
        users,
      });

      new Logger("WebSocket").success(
        `User(${user.id}) connected to server(${server.id})`
      );
    } catch (error) {
      new Logger("WebSocket").error(`Error getting server data: ${error}`);
      socket.emit("error", {
        message: `Error getting server data: ${error}`,
      });
    }
  });

  socket.on("chatMessage", async (data) => {
    try {
      const messageList = (await db.get("messageList")) || {};
      const serverList = (await db.get("serverList")) || {};

      const message = data.message;
      if (!message.content || !message.sender) {
        new Logger("WebSocket").error("Invalid message data");
        socket.emit("error", { message: "Invalid message data" });
        return;
      }
      const server = serverList[data.serverId];
      if (!server) {
        new Logger("WebSocket").error(`Server(${data.serverId}) not found`);
        socket.emit("error", {
          message: `Server(${data.serverId}) not found`,
        });
        return;
      }

      message.id = uuidv4();
      messageList[message.id] = message;
      server.messages.push(message.id);
      await db.set("serverList", serverList);
      await db.set("messageList", messageList);

      const messages = server.messages
        .map((messageId) => messageList[messageId])
        .filter((_) => _);
      io.to(`server_${server.id}`).emit("chatMessage", messages);

      new Logger("WebSocket").info(
        `User(${message.sender}) sent ${message.content} to server(${server.id})`
      );
    } catch (error) {
      new Logger("WebSocket").error(error.message);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("addChannel", async (data) => {
    try {
      const channelList = (await db.get("channelList")) || {};
      const serverList = (await db.get("serverList")) || {};

      const channel = data.channel;
      if (!channel.name || !channel.permission) {
        new Logger("WebSocket").error("Invalid channel data");
        socket.emit("error", { message: "Invalid channel data" });
        return;
      }
      const server = serverList[data.serverId];
      if (!server) {
        new Logger("WebSocket").error(`Server(${data.serverId}) not found`);
        socket.emit("error", {
          message: `Server(${data.serverId}) not found`,
        });
        return;
      }

      channel.id = uuidv4();
      channelList[channel.id] = channel;
      server.channels.push(channel.id);
      await db.set("serverList", serverList);
      await db.set("channelList", channelList);

      const channels = server.channels
        .map((channelId) => channelList[channelId])
        .filter((_) => _);
      io.to(`server_${server.id}`).emit("channel", channels);

      new Logger("WebSocket").info(
        `Adding new channel(${channel.id}) to server(${server.id})`
      );
    } catch (error) {
      new Logger("WebSocket").error(error.message);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("editChannel", async (data) => {
    try {
      const channelList = (await db.get("channelList")) || {};
      const serverList = (await db.get("serverList")) || {};

      const channel = data.channel;
      if (!channel.name || !channel.permission) {
        new Logger("WebSocket").error("Invalid channel data");
        socket.emit("error", { message: "Invalid channel data" });
        return;
      }
      const oldChannel = channelList[data.channelId];
      if (!oldChannel) {
        new Logger("WebSocket").error(`Channel(${data.channelId}) not found`);
        socket.emit("error", {
          message: `Channel(${data.channelId}) not found`,
        });
        return;
      }
      const server = serverList[data.serverId];
      if (!server) {
        new Logger("WebSocket").error(`Server(${data.serverId}) not found`);
        socket.emit("error", {
          message: `Server(${data.serverId}) not found`,
        });
        return;
      }

      channelList[data.channelId] = channel;
      await db.set("serverList", serverList);
      await db.set("channelList", channelList);

      const channels = server.channels.map(
        (channelId) => channelList[channelId]
      );
      io.to(`server_${server.id}`).emit("channel", channels);

      new Logger("WebSocket").info(
        `Edit channel(${channel.id}) in server(${server.id})`
      );
    } catch (error) {
      new Logger("WebSocket").error(error.message);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("deleteChannel", async (data) => {
    try {
      const channelList = (await db.get("channelList")) || {};
      const serverList = (await db.get("serverList")) || {};

      const channel = channelList[data.channelId];
      if (!channel) {
        new Logger("WebSocket").error(`Channel(${data.channelId}) not found`);
        socket.emit("error", {
          message: `Channel(${data.channelId}) not found`,
        });
        return;
      }
      const server = serverList[data.serverId];
      if (!server) {
        new Logger("WebSocket").error(`Server(${data.serverId}) not found`);
        socket.emit("error", {
          message: `Server(${data.serverId}) not found`,
        });
        return;
      }

      delete channelList[channel.id];
      server.channels = server.channels.filter(
        (channelId) => channelId != channel.id
      );
      await db.set("serverList", serverList);
      await db.set("channelList", channelList);

      const channels = server.channels
        .map((channelId) => channelList[channelId])
        .filter((_) => _);
      io.to(`server_${server.id}`).emit("channel", channels);

      new Logger("WebSocket").info(
        `Remove channel(${channel.id}) from server(${server.id})`
      );
    } catch (error) {
      new Logger("WebSocket").error(error.message);
      socket.emit("error", { message: error.message });
    }
  });
});

// Error Handling
server.on("error", (error) => {
  new Logger("Server").error(`Server error: ${error.message}`);
});

process.on("uncaughtException", (error) => {
  new Logger("Server").error(`Uncaught Exception: ${error.message}`);
});

process.on("unhandledRejection", (error) => {
  new Logger("Server").error(`Unhandled Rejection: ${error.message}`);
});

// Start Server
server.listen(port, () => {
  new Logger("Server").success(`Server is running on port ${port}`);
});
