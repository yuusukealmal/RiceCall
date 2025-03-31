/* eslint-disable @typescript-eslint/no-require-imports */
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
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   userId: string,
      //   serverId: string,
      //   memberApplication: {
      //     ...
      //   },
      // }

      // Get data
      const { memberApplication: _newApplication, userId, serverId } = data;
      console.log(data);
      if (!_newApplication || !userId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const server = await Func.validate.server(servers[serverId]);
      const memberApplication = await Func.validate.memberApplication(
        _newApplication,
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      // Create member application
      const applicationId = `ma_${user.id}-${server.id}`;
      const application = await Set.memberApplications(applicationId, {
        ...memberApplication,
        userId: user.id,
        serverId: server.id,
        createdAt: Date.now(),
      });

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(server.id),
      });

      new Logger('WebSocket').success(
        `Member application(${application.id}) of User(${user.id}) and server(${server.id}) created by User(${operator.id})`,
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
        `Error creating member application: ${error.error_message}`,
      );
    }
  },

  updateMemberApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const memberApplications = (await db.get('memberApplications')) || {};

    try {
      // data = {
      //   userId: string,
      //   serverId: string,
      //   memberApplication: {
      //     ...
      //   },
      // }

      // Validate data
      const { memberApplication: _editedApplication, userId, serverId } = data;
      if (!_editedApplication || !userId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const server = await Func.validate.server(servers[serverId]);
      const memberApplication = await Func.validate.memberApplication(
        memberApplications[`ma_${user.id}-${server.id}`],
      );
      const editedApplication = await Func.validate.memberApplication(
        _editedApplication,
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      if (!memberApplication) {
        await db.delete(`memberApplications.${memberApplication.id}`);
        throw new StandardizedError(
          '申請不存在',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'APPLICATION_NOT_FOUND',
          404,
        );
      }
      const applyMember = await Get.member(memberApplication.userId, server.id);
      if (applyMember && applyMember.permissionLevel > 1) {
        await db.delete(`memberApplications.${memberApplication.id}`);
        throw new StandardizedError(
          '該使用者已經是伺服器成員',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'USER_ALREADY_MEMBER',
          403,
        );
      }
      const authorMember = await Get.member(operator.id, server.id);
      if (authorMember.permissionLevel < 5) {
        throw new StandardizedError(
          '您沒有權限執行此操作',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Update member application
      await Set.memberApplications(memberApplication.id, editedApplication);

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(server.id),
      });

      new Logger('WebSocket').success(
        `Member application(${memberApplication.id}) of User(${user.id}) and server(${server.id}) updated by User(${operator.id})`,
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

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error updating member application: ${error.error_message}`,
      );
    }
  },

  deleteMemberApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};
    const memberApplications = (await db.get('memberApplications')) || {};

    try {
      // data = {
      //   userId: string,
      //   serverId: string,
      // }

      // Validate data
      const { userId, serverId } = data;
      if (!userId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DELETEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const server = await Func.validate.server(servers[serverId]);
      const application = await Func.validate.memberApplication(
        memberApplications[`ma_${user.id}-${server.id}`],
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      // Remove member application
      await db.delete(`memberApplications.${application.id}`);

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(server.id),
      });

      new Logger('WebSocket').success(
        `Member application(${application.id}) of User(${user.id}) and server(${server.id}) deleted by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `刪除申請時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'DELETEMEMBERAPPLICATION',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error deleting member application: ${error.error_message}`,
      );
    }
  },
};
module.exports = { ...memberApplicationHandler };
