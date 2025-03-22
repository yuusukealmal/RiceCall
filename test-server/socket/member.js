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
      await Func.validate.socket(socket);

      // Create member
      const memberId = `mb_${user.id}-${server.id}`;
      const member = await Set.member(memberId, newMember);

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
    const servers = (await db.get('servers')) || {};
    const members = (await db.get('members')) || {};

    try {
      // data = {
      //   userId: string;
      //   serverId: string;
      //   member: {
      //     ...
      //   },
      // }

      // Validate data
      const { member: _editedMember, userId, serverId } = data;
      if (!_editedMember || !userId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATEMEMBER',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const server = await Func.validate.server(servers[serverId]);
      const member = await Func.validate.member(
        members[`mb_${user.id}-${server.id}`],
      );
      const editedMember = await Func.validate.member(_editedMember);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      // Update member
      await Set.member(member.id, editedMember);

      // Emit updated data to all users in the server
      io.to(`server_${member.serverId}`).emit('serverUpdate', {
        members: await Get.serverMembers(member.serverId),
      });

      new Logger('Server').success(
        `Member(${member.id}) of server(${member.serverId}) updated by User(${operator.id})`,
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
