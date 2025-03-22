const { v4: uuidv4 } = require('uuid');
const { QuickDB } = require('quick.db');
const db = new QuickDB();
// Utils
const utils = require('../utils');
const {
  standardizedError: StandardizedError,
  logger: Logger,
  get: Get,
  set: Set,
  func: Func,
} = utils;

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
      const existsMemberApplication =
        memberApplications[`ma_${userId}-${serverId}`];

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
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};
    const memberApplications = (await db.get('memberApplications')) || {};
    const { applicationId, action, userId } = data;

    try {
      // Get data
      if (!applicationId || !action) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const memberApplication = memberApplications[applicationId];
      if (!memberApplication) {
        throw new StandardizedError(
          '找不到申請',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'APPLICATION_NOT_FOUND',
          404,
        );
      }
      const server = await Func.validate.server(
        servers[memberApplication.serverId],
      );
      const applyUser = await Func.validate.user(
        users[memberApplication.userId],
      );
      const applyMember = members[`mb_${applyUser.id}-${server.id}`];
      if (applyMember) {
        const applyPermission = applyMember.permissionLevel;
        if (applyPermission > 1) {
          throw new StandardizedError(
            '該使用者已經是伺服器成員',
            'ValidationError',
            'UPDATEMEMBERAPPLICATION',
            'USER_ALREADY_MEMBER',
            403,
          );
        }
      }
      const authorUser = await Func.validate.user(users[userId]);
      const authorMember = await Func.validate.member(
        members[`mb_${authorUser.id}-${server.id}`],
      );
      const authorPermission = authorMember.permissionLevel;
      if (authorPermission < 5) {
        throw new StandardizedError(
          '您沒有權限執行此操作',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Validate operation
      await Func.validate.socket(socket);

      // Update member application
      switch (action) {
        case 'accept':
          await Set.member(`mb_${applyUser.id}-${server.id}`, {
            nickname: applyUser.name,
            serverId: server.id,
            userId: applyUser.id,
            createdAt: Date.now(),
            permissionLevel: 2,
          });
          await db.delete(`memberApplications.${applicationId}`);

          // Emit updated data to all users in the server
          io.to(`server_${server.id}`).emit(
            'serverUpdate',
            await Get.server(server.id),
          );
          break;
        case 'reject':
          await db.delete(`memberApplications.${applicationId}`);
          break;
      }

      new Logger('WebSocket').success(
        `Updated member application(${applicationId}) in server(${server.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `更新申請時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATEMEMBERAPPLICATION',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Remove member application if error
      if (applicationId && memberApplications[applicationId]) {
        await db.delete(`memberApplications.${applicationId}`);
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        'Error updating member application: ' + error.error_message,
      );
    }
  },
  deleteMemberApplication: async (io, socket, data) => {
    // Get database
    const memberApplications = (await db.get('memberApplications')) || {};
  },
};
module.exports = { ...memberApplicationHandler };
