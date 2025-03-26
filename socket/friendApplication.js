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
      const sender = await Func.validate.user(users[senderId]);
      const receiver = await Func.validate.user(users[receiverId]);
      const newApplication = await Func.validate.friendApplication(
        _newApplication,
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Create friend application
      const applicationId = `fa_${sender.id}-${receiver.id}`;
      const application = await Set.friendApplication(applicationId, {
        ...newApplication,
        senderId: sender.id,
        receiverId: receiver.id,
        createdAt: Date.now(),
      });

      // Emit updated data to receiver
      // io.to(receiver.id).emit('friendApplicationUpdate', {
      //   friendApplication: application,
      // });

      new Logger('WebSocket').success(
        `Friend application(${application.id}) of User(${sender.id}) and User(${receiver.id}) created by User(${operator.id})`,
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
      const { friendApplication: _newApplication, senderId, receiverId } = data;
      if (!_newApplication || !senderId || !receiverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEFRIENDAPPLICATION',
          'DATA_INVALID',
          401,
        );
      }
      const sender = await Func.validate.user(users[senderId]);
      const receiver = await Func.validate.user(users[receiverId]);
      const newApplication = await Func.validate.friendApplication(
        _newApplication,
      );
      const application = await Func.validate.friendApplication(
        friendApplications[
          `fa_${sender.id}-${receiver.id}` || `fa_${receiver.id}-${sender.id}`
        ],
      );

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Update friend application
      const updatedApplication = await Set.friendApplication(application.id, {
        ...newApplication,
        createdAt: application.createdAt,
      });

      // Emit updated data to receiver
      // io.to(receiver.id).emit('friendApplicationUpdate', {
      //   friendApplication: updatedApplication,
      // });

      new Logger('WebSocket').success(
        `Friend application(${updatedApplication.id}) of User(${sender.id}) and User(${receiver.id}) updated by User(${operator.id})`,
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
