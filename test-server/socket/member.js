/* eslint-disable @typescript-eslint/no-require-imports */
const { QuickDB } = require('quick.db');
const db = new QuickDB();
// Utils
const utils = require('../utils');
const StandardizedError = utils.standardizedError;
const Logger = utils.logger;
const Get = utils.get;
const Set = utils.set;
const Func = utils.func;

const memberHandler = {
  updateMember: async (io, socket, data) => {
    // Get database
    // const users = (await db.get('users')) || {};
    const members = (await db.get('members')) || {};

    try {
      // data = {
      //   userId: string;
      //   member: {
      //     ...
      //   },
      // }
      // console.log(data);

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
      // const user = await Func.validate.user(users[userId]);
      const editedMember = await Func.validate.member(_editedMember);
      const member = await Func.validate.member(members[editedMember.id]);

      // Validate operation
      await Func.validate.socket(socket);

      const permission = member.permissionLevel;
      if (!permission || permission < 2) {
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
      if (member.id === editedMember.id) {
        throw new StandardizedError(
          '無法更改自己的權限',
          'ValidationError',
          'UPDATEMEMBER',
          'PERMISSION_DENIED',
          403,
        );
      }

      // Update member
      await Set.member(member.id, editedMember);

      // Emit updated data to all users in the server
      io.to(socket.id).emit('memberUpdate', editedMember);

      new Logger('Server').success(`Member(${member.id}) updated`);
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
