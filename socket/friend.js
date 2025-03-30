/* eslint-disable @typescript-eslint/no-require-imports */
const { QuickDB } = require('quick.db');
const db = new QuickDB();
// Utils
const utils = require('../utils');
const {
  standardizedError: StandardizedError,
  logger: Logger,
  set: Set,
  func: Func,
} = utils;

const friendHandler = {
  createFriend: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};

    try {
      // data = {
      //   userId: string;
      //   friend: {
      //     ...
      //   },
      // }

      // Validate data
      const { friend: _newFriend, userId, targetId } = data;
      const user = await Func.validate.user(users[userId]);
      const target = await Func.validate.user(users[targetId]);
      const newFriend = await Func.validate.friend(_newFriend);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Create friend
      const friendId = `fd_${user.id}-${target.id}`;
      const friend = await Set.friend(friendId, {
        ...newFriend,
        user1Id: user.id,
        user2Id: target.id,
        createdAt: Date.now(),
      });

      new Logger('Friend').success(
        `Friend(${friend.id}) of User(${user.id}) and User(${target.id}) created by User(${operator.id})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `建立好友時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATEFRIEND',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Friend').error(
        `Error creating friend: ${error.error_message}`,
      );
    }
  },

  updateFriend: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const friends = (await db.get('friends')) || {};

    try {
      // data = {
      //   userId: string
      //   targetId: string
      //   friend: {
      //     ...
      //   }
      // }

      // Validate data
      const { friend: _editedFriend, userId, targetId } = data;
      if (!_editedFriend || !userId || !targetId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEFRIEND',
          'DATA_INVALID',
          401,
        );
      }
      const friend = await Func.validate.friend(
        friends[`fd_${userId}-${targetId}`] ||
          friends[`fd_${targetId}-${userId}`],
      );
      const editedFriend = await Func.validate.friend(_editedFriend);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      // Update friend
      await Set.friend(friend.id, editedFriend);

      // Emit data (only to the user)
      io.to(socket.id).emit('friendUpdate', editedFriend);

      new Logger('Friend').success(
        `Friend(${friend.id}) of User(${userId}) and User(${targetId}) updated by User(${operator.id})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `更新好友時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATEFRIEND',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Friend').error(
        `Error updating friend: ${error.error_message}`,
      );
    }
  },
};

module.exports = { ...friendHandler };
