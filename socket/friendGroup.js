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

const friendGroupHandler = {
  createFriendGroup: async (io, socket, data) => {
    try {
      const { group: newGroup, userId } = data;
      console.log(newGroup, userId);
      if (!newGroup || !userId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATEFRIENDGROUP',
          'DATA_INVALID',
          401,
        );
      }

      const operatorId = await Func.validate.socket(socket);

      const friendGroupId = uuidv4();
      await Set.friendGroup(friendGroupId, {
        ...newGroup,
        userId,
        createdAt: new Date(),
      });

      io.to(socket.id).emit('userUpdate', {
        friendGroups: await Get.userFriendGroups(operatorId),
      });

      new Logger('FriendGroup').success(
        `FriendGroup(${friendGroupId}) created`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `新增好友群組時發生無法預期的錯誤: ${error.message}`,
        );
      }

      io.to(socket.id).emit('error', error);

      new Logger('FriendGroup').error(
        `Error creating friend group: ${error.error_message}`,
      );
    }
  },

  updateFriendGroup: async (io, socket, data) => {
    // Get database
    const friendGroups = (await db.get('friendGroups')) || {};

    try {
      const { friendGroupId, group } = data;
      if (!friendGroupId || !group) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEFRIENDGROUP',
          'DATA_INVALID',
          401,
        );
      }

      const operatorId = await Func.validate.socket(socket);
      const friendGroup = await Func.validate.friendGroup(
        friendGroups[friendGroupId],
      );

      await Set.friendGroup(friendGroup.id, {
        ...group,
      });

      io.to(socket.id).emit('userUpdate', {
        friendGroups: await Get.userFriendGroups(operatorId),
      });

      new Logger('FriendGroup').success(
        `FriendGroup(${friendGroup.id}) updated`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `更新好友群組時發生無法預期的錯誤: ${error.message}`,
        );
      }

      io.to(socket.id).emit('error', error);

      new Logger('FriendGroup').error(
        `Error updating friend group: ${error.error_message}`,
      );
    }
  },

  deleteFriendGroup: async (io, socket, data) => {
    // Get database
    const friendGroups = (await db.get('friendGroups')) || {};

    try {
      const { friendGroupId } = data;
      if (!friendGroupId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DELETEFRIENDGROUP',
          'DATA_INVALID',
          401,
        );
      }

      const operatorId = await Func.validate.socket(socket);
      const friendGroup = await Func.validate.friendGroup(
        friendGroups[friendGroupId],
      );

      await db.delete(`friendGroups.${friendGroup.id}`);

      io.to(socket.id).emit('userUpdate', {
        friendGroups: await Get.userFriendGroups(operatorId),
      });

      new Logger('FriendGroup').success(
        `FriendGroup(${friendGroup.id}) deleted`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `刪除好友群組時發生無法預期的錯誤: ${error.message}`,
        );
      }

      io.to(socket.id).emit('error', error);

      new Logger('FriendGroup').error(
        `Error deleting friend group: ${error.error_message}`,
      );
    }
  },
};

module.exports = { ...friendGroupHandler };
