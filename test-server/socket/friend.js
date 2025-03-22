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

const friendHandler = {
  updateFriend: async (io, socket, data) => {
    // Get database
    // const users = (await db.get('users')) || {};
    const friends = (await db.get('friends')) || {};

    try {
      // data = {
      //   userId: string
      //   friend: {
      //     ...
      //   }
      // }
      const { friend: _editedFriend, userId } = data;
      if (!_editedFriend || !userId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEFRIEND',
          'DATA_INVALID',
          401,
        );
      }
      // const user = await Func.validate.user(users[userId]);
      const editedFriend = await Func.validate.friend(_editedFriend);
      const friend = await Func.validate.friend(friends[editedFriend.id]);

      // Validate operation
      await Func.validate.socket(socket);

      // const userFriend = friends[`fd_${userId}_${friend.id}`];
      // if (!userFriend) {
      //   throw new StandardizedError(
      //     `你不是此使用者的好友`,
      //     'ValidationError',
      //     'UPDATEFRIEND',
      //     'OPERATOR_NOT_FRIEND',
      //     403,
      //   );
      // }

      // Update friend
      await Set.friend(friend.id, editedFriend);

      // Emit data (only to the user)
      io.to(socket.id).emit('friendUpdate', editedFriend);

      new Logger('Friend').success(`Friend(${friend.id}) updated`);
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
