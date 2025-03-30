/* eslint-disable @typescript-eslint/no-require-imports */
const { QuickDB } = require('quick.db');
const db = new QuickDB();
// Utils
const utils = require('../utils');
const {
  standardizedError: StandardizedError,
  logger: Logger,
  // get: Get,
  set: Set,
  func: Func,
} = utils;

const friendApplicationHandler = {
  createFriendApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};

    try {
      // data = {
      //   senderId: string,
      //   receiverId: string,
      //   friendApplication: {
      //     ...
      //   },
      // }

      // Get data
      const { friendApplication: _newApplication, senderId, receiverId } = data;
      if (!_newApplication || !senderId || !receiverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEFRIENDAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const newApplication = await Func.validate.friendApplication(
        _newApplication,
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Create friend application
      const applicationId = `fa_${senderId}-${receiverId}`;
      const application = await Set.friendApplication(applicationId, {
        ...newApplication,
        senderId: senderId,
        receiverId: receiverId,
        createdAt: Date.now(),
      });

      // Emit updated data to receiver
      // io.to(receiver.id).emit('friendApplicationUpdate', {
      //   friendApplication: application,
      // });

      new Logger('WebSocket').success(
        `Friend application(${application.id}) of User(${senderId}) and User(${receiverId}) created by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `創建申請時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATEFRIENDAPPLICATION',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error creating friend application: ${error.error_message}`,
      );
    }
  },

  updateFriendApplication: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const friendApplications = (await db.get('friendApplications')) || {};

    try {
      // data = {
      //   senderId: string,
      //   receiverId: string,
      //   friendApplication: {
      //     ...
      //   },
      // }

      // Get data
      const {
        friendApplication: _editedApplication,
        senderId,
        receiverId,
      } = data;
      if (!_editedApplication || !senderId || !receiverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEFRIENDAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const editedApplication = await Func.validate.friendApplication(
        _editedApplication,
      );
      const application = await Func.validate.friendApplication(
        friendApplications[`fa_${senderId}-${receiverId}`],
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Update friend application
      await Set.friendApplication(application.id, editedApplication);

      // Emit updated data to receiver
      // io.to(receiver.id).emit('friendApplicationUpdate', {
      //   friendApplication: updatedApplication,
      // });

      new Logger('WebSocket').success(
        `Friend application(${application.id}) of User(${senderId}) and User(${receiverId}) updated by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `更新申請時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATEFRIENDAPPLICATION',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        `Error updating friend application: ${error.error_message}`,
      );
    }
  },
};

module.exports = { ...friendApplicationHandler };
