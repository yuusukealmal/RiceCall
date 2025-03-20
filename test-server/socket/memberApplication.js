const { v4: uuidv4 } = require('uuid');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
// Utils
const utils = require('../utils');
const StandardizedError = utils.standardizedError;
const Logger = utils.logger;
const Map = utils.map;
const Get = utils.get;
const Interval = utils.interval;
const Func = utils.func;
const Set = utils.set;
const JWT = utils.jwt;

const memberApplicationHandler = {
  createMemberApplication: async (io, socket, data) => {
    // Get database
    const memberApplications = (await db.get('memberApplications')) || {};
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    try {
      // Get data
      const { memberApplication } = data;
      if (!memberApplication) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const { serverId, userId, description } = memberApplication;
      const server = await Func.validate.server(servers[serverId]);
      const user = await Func.validate.user(users[userId]);

      // Validate operation
      await Func.validate.socket(socket);

      // Check if application exists
      const existsMemberApplication = Object.values(memberApplications).find(
        (memberApplication) =>
          memberApplication.serverId === serverId &&
          memberApplication.userId === userId,
      );

      // Create or Update member application
      const memberApplicationId = existsMemberApplication
        ? existsMemberApplication.id
        : uuidv4();
      Set.memberApplications(memberApplicationId, {
        description:
          description.length > 50
            ? description.slice(0, 50).join('...')
            : description,
        serverId,
        userId,
        createdAt: Date.now(),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) ${
          existsMemberApplication ? 'updated' : 'created'
        } member application(${memberApplicationId}) in server(${server.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `創建申請時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATEMEMBERAPPLICATION',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        'Error updating channel: ' + error.error_message,
      );
    }
  },
  updateMemberApplication: async (io, socket, data) => {
    // Get database
    const memberApplications = (await db.get('memberApplications')) || {};
  },
  deleteMemberApplication: async (io, socket, data) => {
    // Get database
    const memberApplications = (await db.get('memberApplications')) || {};
  },
};
module.exports = { ...memberApplicationHandler };
