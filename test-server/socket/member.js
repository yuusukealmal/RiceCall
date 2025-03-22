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

// Handlers
const serverHandler = require('./server');

const memberHandler = {
  updateMember: async (io, socket, data) => {
    try {
      // data = {
      //   userId: string;
      //   member: {
      //     ...
      //   },
      // }
      // console.log(data);

      // Validate data
      const { member: editedMember, userId, action } = data;
      if (!editedMember || !userId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBER',
          'DATA_INVALID',
          401,
        );
      }

      await Func.validate.member(editedMember);
      const [server, editedUser, authorMember] = await Promise.all([
        Get.server(editedMember.serverId),
        Get.user(editedMember.userId),
        Get.member(userId, editedMember.serverId),
      ]);

      // Validate operation
      await Func.validate.socket(socket);

      const permission = authorMember.permissionLevel;
      if (action == 'nickname') {
        if (userId != editedUser.id && permission < 5) {
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
            '暱稱長度不得超過 20 個字元',
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
        if (permission < editedMember.permissionLevel) {
          throw new StandardizedError(
            '你沒有權限更改此成員的權限',
            'ValidationError',
            'UPDATEMEMBER',
            'PERMISSION_DENIED',
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
        if (action == 'disconnect' && editedUser.currentServerId == server.id) {
          // FIXME: Replace socket to target socket
          // serverHandler.disconnectServer(io, socket, {
          //   userId: editedMember.id,
          //   serverId: server.id,
          // });
        }
      }

      // Update member
      await Set.member(editedMember.id, editedMember);

      // Emit updated data to all users in the server
      if (editedUser.currentServerId == server.id)
        io.to(socket.id).emit('memberUpdate', editedMember);

      // Emit updated data to all users in the server
      io.to(`server_${server.id}`).emit('serverUpdate', {
        members: await Get.serverMembers(server.id),
      });

      new Logger('Server').success(`Member(${editedMember.id}) updated`);
    } catch (error) {
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
