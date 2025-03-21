/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('fs').promises;
const path = require('path');
const formidable = require('formidable');

// Utils
const utils = require('./utils');
const StandardizedError = utils.standardizedError;
const Logger = utils.logger;
const Func = utils.func;
const Set = utils.set;
const Get = utils.get;
const JWT = utils.jwt;
const Clean = utils.clean;

// Constants
const {
  PORT,
  CONTENT_TYPE_JSON,
  MIME_TYPES,
  UPLOADS_PATH,
  SERVER_AVATAR_PATH,
  UPLOADS_DIR,
  SERVER_AVATAR_DIR,
  USER_AVATAR_DIR,
} = require('./constant');

// Send Error/Success Response
const sendError = (res, statusCode, message) => {
  res.writeHead(statusCode, CONTENT_TYPE_JSON);
  res.end(JSON.stringify({ error: message }));
};

const sendSuccess = (res, data) => {
  res.writeHead(200, CONTENT_TYPE_JSON);
  res.end(JSON.stringify(data));
};

// HTTP Server
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    try {
      // Get the file path relative to uploads directory
      const relativePath = req.url.replace('/uploads/', '');
      const filePath = path.join(UPLOADS_DIR, relativePath);

      // Validate file path to prevent directory traversal
      if (!filePath.startsWith(UPLOADS_DIR)) {
        sendError(res, 403, '無權限存取此檔案');
        return;
      }

      // Get file extension and MIME type
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      // Read and serve the file
      fs.readFile(filePath)
        .then((data) => {
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            'Access-Control-Allow-Origin': '*', // 允許跨域存取
          });
          res.end(data);
        })
        .catch((error) => {
          if (error.code === 'ENOENT') {
            sendError(res, 404, '找不到檔案');
          } else {
            sendError(res, 500, '讀取檔案失敗');
          }
        });
      return;
    } catch (error) {
      console.log(error);
      sendError(res, 500, '伺服器錯誤');
      return;
    }
  }

  if (req.method == 'POST' && req.url == '/login') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "password": "123456",
        //   "account": "test",
        // }
        // console.log(data);

        // Get database
        const accountPasswords = (await db.get(`accountPasswords`)) || {};
        const accountUserIds = (await db.get(`accountUserIds`)) || {};
        const users = (await db.get(`users`)) || {};

        // Validate data
        const { account, password } = data;
        if (!account || !password) {
          throw new StandardizedError(
            '無效的帳號或密碼',
            'ValidationError',
            'LOGIN',
            'INVALID_ACCOUNT_OR_PASSWORD',
            401,
          );
        }
        const exist = accountPasswords[account];
        if (!exist) {
          throw new StandardizedError(
            '帳號或密碼錯誤',
            'ValidationError',
            'LOGIN',
            'INVALID_ACCOUNT_OR_PASSWORD',
            401,
          );
        }
        if (password !== accountPasswords[account]) {
          throw new StandardizedError(
            '帳號或密碼錯誤',
            'ValidationError',
            'LOGIN',
            'INVALID_ACCOUNT_OR_PASSWORD',
            401,
          );
        }
        const userId = accountUserIds[account];
        if (!userId) {
          throw new StandardizedError(
            '用戶不存在',
            'ValidationError',
            'LOGIN',
            'USER_NOT_FOUND',
            404,
          );
        }
        const user = users[userId];
        if (!user) {
          throw new StandardizedError(
            '用戶不存在',
            'ValidationError',
            'LOGIN',
            'USER_NOT_FOUND',
            404,
          );
        }

        // Update user
        await Set.user(user.id, {
          lastActiveAt: Date.now(),
        });

        // Generate JWT token
        const token = JWT.generateToken({
          userId: user.id,
        });

        sendSuccess(res, {
          message: '登入成功',
          data: { token: token },
        });
        new Logger('Auth').success(`User logged in: ${account}`);
      } catch (error) {
        if (!(error instanceof StandardizedError)) {
          error = new StandardizedError(
            `登入時發生預期外的錯誤: ${error.message}`,
            'ServerError',
            'LOGIN',
            'SERVER_ERROR',
            500,
          );
        }

        sendError(res, error.status_code, error.error_message);
        new Logger('Auth').error(`Login error: ${error.error_message}`);
      }
    });
    return;
  }

  if (req.method == 'POST' && req.url == '/register') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        // data = {
        //   "account": "test",
        //   "password": "123456",
        //   "username": "test",
        // }
        // console.log(data);

        // Get database
        const accountPasswords = (await db.get(`accountPasswords`)) || {};

        // Validate data
        const { account, password, username } = data;
        Func.validate.account(account.trim());
        Func.validate.password(password.trim());
        Func.validate.nickname(username.trim());

        const exists = accountPasswords[account];
        if (exists) {
          throw new StandardizedError(
            '帳號已存在',
            'ValidationError',
            'REGISTER',
            'ACCOUNT_ALREADY_EXISTS',
            401,
          );
        }

        // Create user data
        const userId = uuidv4();
        await Set.user(userId, {
          name: username,
        });

        // Create account password list
        await db.set(`accountPasswords.${account}`, password);
        await db.set(`accountUserIds.${account}`, userId);

        sendSuccess(res, {
          message: '註冊成功',
          data: {
            // user: await Get.user(user.id),
          },
        });
        new Logger('Auth').success(`User registered: ${account}`);
      } catch (error) {
        if (!(error instanceof StandardizedError)) {
          error = new StandardizedError(
            `註冊時發生預期外的錯誤: ${error.message}`,
            'ServerError',
            'REGISTER',
            'SERVER_ERROR',
            500,
          );
        }

        sendError(res, error.status_code, error.error_message);
        new Logger('Auth').error(`Register error: ${error.error_message}`);
      }
    });
    return;
  }

  // Refresh
  if (req.method == 'POST' && req.url.startsWith('/refresh')) {
    if (req.url == '/refresh/user') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { userId } = data;
          if (!userId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHUSER',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.user(userId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHUSER',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/server') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { serverId } = data;
          if (!serverId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHSERVER',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.server(serverId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHSERVER',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/channel') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { channelId } = data;
          if (!channelId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHCHANNEL',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.channel(channelId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHCHANNEL',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/member') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { userId, serverId } = data;
          if (!userId || !serverId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHMEMBER',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.member(userId, serverId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHMEMBER',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/memberApplication') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { senderId, receiverId } = data;
          if (!senderId || !receiverId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHMEMBERAPPLICATION',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.memberApplication(senderId, receiverId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHMEMBERAPPLICATION',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/friend') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { userId, targetId } = data;
          if (!userId || !targetId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHFRIEND',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.friend(userId, targetId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHFRIEND',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    if (req.url == '/refresh/friendApplication') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { senderId, receiverId } = data;
          if (!senderId || !receiverId) {
            throw new StandardizedError(
              '無效的資料',
              'ValidationError',
              'REFRESHFRIENDAPPLICATION',
              'DATA_INVALID',
            );
          }
          sendSuccess(res, {
            message: 'success',
            data: await Get.friendApplication(senderId, receiverId),
          });
        } catch (error) {
          if (!(error instanceof StandardizedError)) {
            error = new StandardizedError(
              `刷新資料時發生預期外的錯誤: ${error.message}`,
              'ServerError',
              'REFRESHFRIENDAPPLICATION',
              'EXCEPTION_ERROR',
              500,
            );
          }
          sendError(res, error.status_code, error.error_message);
          new Logger('Server').error(`Refresh error: ${error.error_message}`);
        }
      });
      return;
    }
    return;
  }

  if (req.method == 'POST' && req.url == '/upload/updateAvatar') {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields) => {
      try {
        if (err) throw new Error('Error parsing form data');

        const { _serverId, _avatar, _userId } = fields;
        if (!_avatar || (!_serverId && !_userId))
          throw new Error('Invalid form data');

        const file = _avatar[0];
        const serverId = _serverId ? _serverId[0] : null;
        const userId = _userId ? _userId[0] : null;
        if (!file || (!serverId && !userId))
          throw new Error('Invalid form data');

        const matches = file.match(/^data:image\/(.*?);base64,/);
        if (!matches) throw new Error('Invalid file data');
        const ext = matches[1];
        if (!MIME_TYPES[`.${ext}`]) throw new Error('Invalid file type');

        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        const dataBuffer = Buffer.from(base64Data, 'base64');
        if (dataBuffer.size > 5 * 1024 * 1024)
          throw new Error('File size too large');

        const fileName = `${serverId || userId}.${ext}`;
        const filePath = path.join(
          serverId ? SERVER_AVATAR_DIR : USER_AVATAR_DIR,
          fileName,
        );

        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }

        await fs.writeFile(filePath, dataBuffer);
        sendSuccess(res, { message: 'success' });
      } catch (error) {
        throw new StandardizedError(
          error.message,
          'ValidationError',
          'UPLOADAVATAR',
          'INVALID_FILE_TYPE',
          400,
        );
      }
    });
    return;
  }

  if (req.method == 'POST' && req.url == '/upload/avatar') {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields) => {
      try {
        if (err) throw new Error('Error parsing form data');

        const { _type, _userId, _avatar } = fields;
        if (!_type || !_userId || !_avatar)
          throw new Error('Invalid form data');

        const type = _type[0];
        const userId = _userId[0];
        const file = _avatar[0];
        if (!type || !userId || !file) throw new Error('Invalid form data');

        const matches = file.match(/^data:image\/(.*?);base64,/);
        if (!matches) throw new Error('Invalid file data');
        const ext = matches[1];
        if (!MIME_TYPES[`.${ext}`]) throw new Error('Invalid file type');

        const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
        const dataBuffer = Buffer.from(base64Data, 'base64');
        if (dataBuffer.size > 5 * 1024 * 1024)
          throw new Error('File size too large');

        const fileName = `preupload-${userId}.${ext}`;
        const filePath = path.join(
          type === 'server' ? SERVER_AVATAR_DIR : USER_AVATAR_DIR,
          fileName,
        );

        try {
          await fs.access(filePath);
          await fs.unlink(filePath);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
        }

        await fs.writeFile(filePath, dataBuffer);
        sendSuccess(res, { message: 'success', fileName });
      } catch (error) {
        throw new StandardizedError(
          error.message,
          'ValidationError',
          'UPLOADAVATAR',
          'INVALID_FILE_TYPE',
          400,
        );
      }
    });
    return;
  }

  sendSuccess(res, { message: 'Hello World!' });
  return;
});

// Socket Server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
  },
});

require('./socket/index')(io, db);

// Error Handling
server.on('error', (error) => {
  if (!(error instanceof StandardizedError)) {
    error = new StandardizedError(
      `伺服器發生預期外的錯誤: ${error.message}`,
      'ServerError',
      'SERVER_ERROR',
      'SERVER_ERROR',
      500,
    );
  }
  new Logger('Server').error(`Server error: ${error.error_message}`);
});

process.on('uncaughtException', (error) => {
  if (!(error instanceof StandardizedError)) {
    error = new StandardizedError(
      `未處理的例外: ${error.message}`,
      'ServerError',
      'UNCAUGHT_EXCEPTION',
      'SERVER_ERROR',
      500,
    );
  }
  new Logger('Server').error(`Uncaught Exception: ${error.error_message}`);
});

process.on('unhandledRejection', (error) => {
  if (!(error instanceof StandardizedError)) {
    error = new StandardizedError(
      `未處理的拒絕: ${error.message}`,
      'ServerError',
      'UNHANDLED_REJECTION',
      'SERVER_ERROR',
      500,
    );
  }
  new Logger('Server').error(`Unhandled Rejection: ${error.error_message}`);
});

// Start Server
server.listen(PORT, () => {
  new Logger('Server').success(`Server is running on port ${PORT}`);
  Clean.setupCleanupInterval();
});
