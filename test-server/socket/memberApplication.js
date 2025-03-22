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

    try {
      // data = {
      //   userId: string,
      //   memberApplication: {
      //     ...
      //   },
      // }

      // Get data
      const { memberApplication: _newApplication, userId } = data;
      if (!_newApplication) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const memberApplication = await Func.validate.memberApplication(
        _newApplication,
      );

      // Validate operation
      await Func.validate.socket(socket);
      // TODO: Add validation for operator

      // Create member application
      const applicationId = `ma_${memberApplication.userId}-${memberApplication.serverId}`;
      Set.memberApplications(applicationId, {
        ...memberApplication,
        createdAt: Date.now(),
      });

      // Emit updated data to all users in the server
      io.to(`server_${memberApplication.serverId}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(
          memberApplication.serverId,
        ),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) created member application(${applicationId}) in server(${memberApplication.serverId})`,
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
        'Error creating member application: ' + error.error_message,
      );
    }
  },

  updateMemberApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const memberApplications = (await db.get('memberApplications')) || {};

    try {
      // data = {
      //   userId: string,
      //   memberApplication: {
      //     ...
      //   },
      // }

      // Validate data
      const { memberApplication: _editedApplication, userId } = data;
      if (!_editedApplication) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const editedApplication = await Func.validate.memberApplication(
        _editedApplication,
      );
      const application = await Func.validate.memberApplication(
        memberApplications[editedApplication.id],
      );

      // Validate operation
      await Func.validate.socket(socket);
      // TODO: Add validation for operator

      // Update member application
      await Set.memberApplications(application.id, editedApplication);

      // Emit updated data to all users in the server
      io.to(`server_${application.serverId}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(application.serverId),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) updated member application(${application.id}) in server(${application.serverId})`,
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
        'Error updating member application: ' + error.error_message,
      );
    }
  },

  deleteMemberApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const memberApplications = (await db.get('memberApplications')) || {};

    try {
      // data = {
      //   userId: string,
      //   memberApplicationId: string,
      // }

      // Validate data
      const { memberApplicationId: applicationId, userId } = data;
      if (!applicationId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DELETEMEMBERAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const application = await Func.validate.memberApplication(
        memberApplications[applicationId],
      );

      // Validate operation
      await Func.validate.socket(socket);
      // TODO: Add validation for operator

      // Remove member application
      await db.delete(`memberApplications.${applicationId}`);

      // Emit updated data to all users in the server
      io.to(`server_${application.serverId}`).emit('serverUpdate', {
        memberApplications: await Get.serverApplications(application.serverId),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) deleted member application(${application.id}) in server(${application.serverId})`,
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
        'Error deleting member application: ' + error.error_message,
      );
    }
  },
};
module.exports = { ...memberApplicationHandler };
