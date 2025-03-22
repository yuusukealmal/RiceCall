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
  updateMember: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const members = (await db.get('members')) || {};

    try {
      // data = {
      //   userId: string;
      //   member: {
      //     ...
      //   },
      // }

      // Validate data
      const { member: _editedMember, userId } = data;
      if (!_editedMember || !userId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBER',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const editedMember = await Func.validate.member(_editedMember);
      const member = await Func.validate.member(members[editedMember.id]);

      // Validate operation
      await Func.validate.socket(socket);
      // TODO: Add validation for operator

      // Update member
      await Set.member(member.id, editedMember);

      // Emit updated data to all users in the server
      io.to(`server_${member.serverId}`).emit('serverUpdate', {
        members: await Get.serverMembers(member.serverId),
      });

      new Logger('Server').success(
        `User(${user.id}) updated member(${member.id}) in server(${member.serverId})`,
      );
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
