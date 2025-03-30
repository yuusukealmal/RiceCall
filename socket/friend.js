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
  get: Get,
} = utils;

const friendHandler = {
  createFriend: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};

    try {
      // data = {
      //   userId: string;
      //   targetId: string;
      //   friend: {
      //     ...
      //   },
      // }

      // Validate data
      const { friend: _newFriend, userId, targetId } = data;
      if (!_newFriend || !userId || !targetId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEFRIEND',
          'DATA_INVALID',
          401,
        );
      }

      const newFriend = await Func.validate.friend(_newFriend);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Create friend
      const friendId = `fd_${userId}-${targetId}`;
      await Set.friend(friendId, {
        ...newFriend,
        userId: userId,
        targetId: targetId,
        createdAt: Date.now(),
      });

      // Create reverse friend
      const reverseFriendId = `fd_${targetId}-${userId}`;
      await Set.friend(reverseFriendId, {
        ...newFriend,
        friendGroupId: '',
        userId: targetId,
        targetId: userId,
        createdAt: Date.now(),
      });

      // Emit data (only to the user)
      io.to(socket.id).emit('userUpdate', {
        friends: await Get.userFriends(userId),
      });

      new Logger('Friend').success(
        `Friend(${friendId}) and Friend(${reverseFriendId}) of User(${userId}) and User(${targetId}) created by User(${operator.id})`,
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

      const editedFriend = await Func.validate.friend(_editedFriend);
      const friendId = `fd_${userId}-${targetId}`;
      const friend = await Func.validate.friend(friends[friendId]);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Update friend
      await Set.friend(friend.id, editedFriend);

      // Emit data (only to the user)
      io.to(socket.id).emit('friendUpdate', editedFriend);
      io.to(socket.id).emit('userUpdate', {
        friends: await Get.userFriends(userId),
      });

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
  deleteFriend: async (io, socket, data) => {
    // Get database
    const friends = (await db.get('friends')) || {};

    try {
      // data = {
      //   userId: string
      //   targetId: string
      // }

      // FIX: Change to userId and targetId

      // Validate data
      const { friendId } = data;
      if (!friendId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DELETEFRIEND',
          'DATA_INVALID',
          401,
        );
      }

      const friend = await Func.validate.friend(friends[friendId]);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);

      await db.delete(`friends.${`fd_${friend.userId}-${friend.targetId}`}`);
      await db.delete(`friends.${`fd_${friend.targetId}-${friend.userId}`}`);

      // Emit data (only to the user)
      io.to(socket.id).emit('userUpdate', {
        friends: await Get.userFriends(operatorId),
      });

      new Logger('Friend').success(`Friend(${friend.id}) deleted`);
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `刪除好友時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'DELETEFRIEND',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Friend').error(
        `Error deleting friend: ${error.error_message}`,
      );
    }
  },
};

module.exports = { ...friendHandler };
