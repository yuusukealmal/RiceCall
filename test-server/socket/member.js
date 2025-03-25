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

const memberHandler = {
  createMember: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   userId: string;
      //   serverId: string;
      //   member: {
      //     ...
      //   },
      // }

      // Validate data
      const { member: _newMember, userId, serverId } = data;
      const user = await Func.validate.user(users[userId]);
      const server = await Func.validate.server(servers[serverId]);
      const newMember = await Func.validate.member(_newMember);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Create member
      const memberId = `mb_${user.id}-${server.id}`;
      const member = await Set.member(memberId, {
        ...newMember,
        userId: user.id,
        serverId: server.id,
        createdAt: Date.now(),
      });

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', {
        members: await Get.serverMembers(server.id),
      });

      new Logger('Server').success(
        `Member(${member.id}) of server(${server.id}) created by User(${operator.id})`,
      );
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `建立成員時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATEMEMBER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Server').error(
        `Error creating member: ${error.error_message}`,
      );
    }
  },

  updateMember: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};

    try {
      // data = {
      //   userId: string;
      //   serverId: string;
      //   member: {
      //     ...
      //   },
      // }

      // Validate data
      const { member: _editedMember, userId, serverId, action } = data;
      if (!_editedMember || !userId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBER',
          'DATA_INVALID',
          401,
        );
      }

      const editedMember = await Func.validate.member(_editedMember);
      const [originalMember, authorMember] = await Promise.all([
        Get.member(editedMember.userId, serverId),
        Get.member(userId, serverId),
      ]);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      const permission = authorMember.permissionLevel;
      if (action == 'nickname') {
        if (userId != editedMember.userId && permission < 5) {
          throw new StandardizedError(
            '你沒有權限更改其他成員的暱稱',
            'ValidationError',
            'UPDATEMEMBER',
            'PERMISSION_DENIED',
            403,
          );
        }
        if (editedMember.nickname.length > 30) {
          throw new StandardizedError(
            '暱稱長度不得超過 30 個字元',
            'ValidationError',
            'UPDATEMEMBER',
            'NICKNAME_TOO_LONG',
            400,
          );
        }
      } else {
        if (!permission || permission < 3) {
          throw new StandardizedError(
            '無足夠的權限',
            'ValidationError',
            'UPDATEMEMBER',
            'USER_PERMISSION',
            403,
          );
        }
        if (authorMember.id === editedMember.id) {
          throw new StandardizedError(
            '無法更改自己的權限',
            'ValidationError',
            'UPDATEMEMBER',
            'PERMISSION_DENIED',
            403,
          );
        }
        if (
          permission < originalMember.permissionLevel ||
          permission < editedMember.permissionLevel
        ) {
          throw new StandardizedError(
            '你沒有權限更改此成員的權限',
            'ValidationError',
            'UPDATEMEMBER',
            'PERMISSION_DENIED',
            403,
          );
        }

        // if (action == 'disconnect' && editedUser.currentServerId == server.id) {
        //   FIXME: Replace socket to target socket
        //   serverHandler.disconnectServer(io, socket, {
        //     userId: editedMember.id,
        //     serverId: server.id,
        //   });
        // }
      }

      // Update member
      await Set.member(editedMember.id, editedMember);

      // Emit updated data to all users in the server
      io.to(`server_${editedMember.serverId}`).emit('serverUpdate', {
        members: await Get.serverMembers(editedMember.serverId),
      });

      new Logger('Server').success(
        `Member(${editedMember.id}) of server(${editedMember.serverId}) updated by User(${operator.id})`,
      );
    } catch (error) {
      console.log(error);
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `更新成員時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATEMEMBER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('Server').error(
        `Error updating member: ${error.error_message}`,
      );
    }
  },
};

module.exports = { ...memberHandler };
