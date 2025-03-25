/* eslint-disable @typescript-eslint/no-require-imports */
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
  xp: XP,
} = utils;
// Handlers
const rtcHandler = require('./rtc');

const channelHandler = {
  connectChannel: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const channels = (await db.get('channels')) || {};

    try {
      // data = {
      //   userId: string
      //   channelId: string
      // }

      // Validate data
      const { userId, channelId } = data;
      if (!userId || !channelId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CONNECTCHANNEL',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const channel = await Func.validate.channel(channels[channelId]);
      const server = await Get.server(channel.serverId);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);
      // TODO: Add validation for operator

      if (channel.visibility === 'readonly')
        throw new StandardizedError(
          '該頻道為唯獨頻道',
          'ValidationError',
          'CONNECTCHANNEL',
          'CHANNEL_IS_READONLY',
          403,
        );
      const member = await Get.member(operator.id, channel.serverId);
      if (
        (server.visibility === 'member' || channel.visibility === 'member') &&
        (!member || member.permissionLevel < 2)
      )
        throw new StandardizedError(
          '您需要成為該群組的會員才能加入該頻道',
          'ValidationError',
          'CONNECTCHANNEL',
          'SERVER_PRIVATE',
          403,
        );
      if (
        (server.visibility === 'private' || channel.visibility === 'private') &&
        (!member || member.permissionLevel < 3)
      )
        throw new StandardizedError(
          '您需要成為該群組的管理員才能加入該頻道',
          'ValidationError',
          'CONNECTCHANNEL',
          'SERVER_PRIVATE',
          403,
        );

      if (user.currentChannelId) {
        // Disconnect the user from the current channel
        await channelHandler.disconnectChannel(io, socket, {
          channelId: user.currentChannelId,
          userId: user.id,
        });
      }

      // Update user
      const update = {
        currentChannelId: channel.id,
        lastActiveAt: Date.now(),
      };
      await Set.user(userId, update);

      // Setup user interval for accumulate contribution
      XP.setup(socket);

      // Play sound
      io.to(`channel_${channel.id}`).emit('playSound', 'join');

      // Join the channel
      await rtcHandler.join(io, socket, { channelId: channel.id });

      // Emit updated data (only to the user)
      io.to(socket.id).emit('userUpdate', update);
      io.to(socket.id).emit('channelUpdate', await Get.channel(channel.id));

      // Emit updated data (to all users in the server)
      io.to(`server_${channel.serverId}`).emit('serverUpdate', {
        members: await Get.serverMembers(channel.serverId),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) connected to channel(${channel.id}) by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `加入頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CONNECTCHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);
      io.to(socket.id).emit('channelUpdate', null);

      new Logger('WebSocket').error(
        `Error connecting to channel: ${error.error_message}`,
      );
    }
  },

  disconnectChannel: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const channels = (await db.get('channels')) || {};

    try {
      // data = {
      //   userId: string
      //   channelId: string
      // }

      // Validate data
      const { userId, channelId } = data;
      if (!userId || !channelId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'DISCONNECTCHANNEL',
          'DATA_INVALID',
          401,
        );
      }
      const user = await Func.validate.user(users[userId]);
      const channel = await Func.validate.channel(channels[channelId]);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // Update user
      const update = {
        currentChannelId: null,
        lastActiveAt: Date.now(),
      };
      await Set.user(userId, update);

      // Clear user contribution interval
      XP.clear(socket);

      // Leave the channel
      await rtcHandler.leave(io, socket, { channelId: channel.id });

      // Play sound
      io.to(`channel_${channel.id}`).emit('playSound', 'leave');

      // Emit updated data (only to the user)
      io.to(socket.id).emit('userUpdate', update);
      io.to(socket.id).emit('channelUpdate', null);

      // Emit updated data (to all users in the server)
      io.to(`server_${channel.serverId}`).emit('serverUpdate', {
        members: await Get.serverMembers(channel.serverId),
      });

      new Logger('WebSocket').success(
        `User(${user.id}) disconnected from channel(${channel.id}) by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `離開頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'DISCONNECTCHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);
      io.to(socket.id).emit('channelUpdate', null);

      new Logger('WebSocket').error(
        `Error disconnecting from channel: ${error.error_message}`,
      );
    }
  },

  createChannel: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   serverId: string
      //   channel: {
      //     ...
      //   },
      // }

      // Validate data
      const { channel: _newChannel, serverId } = data;
      if (!_newChannel || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'CREATECHANNEL',
          'DATA_INVALID',
          401,
        );
      }
      const server = await Func.validate.server(servers[serverId]);
      const newChannel = await Func.validate.channel(_newChannel);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      // FIX: Check operator permission instead
      const member = await Get.member(operator.id, server.id);
      const permission = member.permissionLevel;
      if (!permission || permission < 4) {
        throw new StandardizedError(
          '無足夠的權限',
          'ValidationError',
          'CREATECHANNEL',
          'USER_PERMISSION',
          403,
        );
      }

      // Create new channel
      const channelId = uuidv4();
      const channel = await Set.channel(channelId, {
        ...newChannel,
        serverId: server.id,
        order: await Get.serverChannels(server.id).length,
        createdAt: Date.now().valueOf(),
      });

      if (newChannel.categoryId) {
        const parentChannel = await Get.channel(newChannel.categoryId);
        if (parentChannel) {
          await Set.channel(parentChannel.id, {
            isRoot: true,
            type: 'category',
          });
        }
      }

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        channels: await Get.serverChannels(server.id),
      });

      new Logger('WebSocket').success(
        `Channel(${channel.id}) created in server(${server.id}) by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `新增頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'CREATECHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        'Error creating channel: ' + error.error_message,
      );
    }
  },

  updateChannel: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const channels = (await db.get('channels')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   serverId: string
      //   channelId: string
      //   channel: {
      //     ...
      //   },
      // };

      // Validate
      const { channel: _editedChannel, channelId, serverId } = data;
      if (!_editedChannel || !channelId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'UPDATECHANNEL',
          'DATA_INVALID',
          401,
        );
      }
      const server = await Func.validate.server(servers[serverId]);
      const channel = await Func.validate.channel(channels[channelId]);
      const editedChannel = await Func.validate.channel(_editedChannel);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      const member = await Get.member(operator.id, server.id);
      const permission = member.permissionLevel;
      if (!permission || permission < 3) {
        throw new StandardizedError(
          '無足夠的權限',
          'ValidationError',
          'UPDATECHANNEL',
          'USER_PERMISSION',
          403,
        );
      }

      // Update channel
      await Set.channel(channel.id, editedChannel);

      // Emit updated data (to all users in the channel)
      io.to(`channel_${channel.id}`).emit('channelUpdate', editedChannel);

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        channels: await Get.serverChannels(server.id),
      });

      new Logger('WebSocket').success(
        `Channel(${channel.id}) updated in server(${server.id}) by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `編輯頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'UPDATECHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        'Error updating channel: ' + error.error_message,
      );
    }
  },

  deleteChannel: async (io, socket, data) => {
    // Get database
    const users = (await db.get('users')) || {};
    const channels = (await db.get('channels')) || {};
    const servers = (await db.get('servers')) || {};

    try {
      // data = {
      //   serverId: string
      //   channelId: string
      // }

      // Validate data
      const { channelId, serverId } = data;
      if (!channelId || !serverId) {
        throw new StandardizedError(
          '無效的資料',
          'DELETECHANNEL',
          'ValidationError',
          'DATA_INVALID',
          401,
        );
      }
      const channel = await Func.validate.channel(channels[channelId]);
      const server = await Func.validate.server(servers[serverId]);

      // Validate operation
      const operatorId = await Func.validate.socket(socket);
      const operator = await Func.validate.user(users[operatorId]);

      const member = await Get.member(operator.id, server.id);
      const permission = member.permissionLevel;
      if (!permission || permission < 4) {
        throw new StandardizedError(
          '無足夠的權限',
          'ValidationError',
          'DELETECHANNEL',
          'USER_PERMISSION',
          403,
        );
      }

      // Update channel
      await Set.channel(channelId, { serverId: null });

      // If the deleted channel has a parent channel, update the parent channel status
      if (channel.categoryId) {
        const serverChannels = await Get.serverChannels(server.id);
        const parentChannel = await Get.channel(channel.categoryId);
        const parentChannelHasChildren = serverChannels.some(
          (c) => c.categoryId === parentChannel.id && c.id !== channel.id,
        );

        if (!parentChannelHasChildren) {
          await Set.channel(parentChannel.id, {
            isRoot: true,
            type: 'channel',
            categoryId: null,
            order: parentChannel.order,
          });
        }
      }

      // Emit updated data (to all users in the server)
      io.to(`server_${server.id}`).emit('serverUpdate', {
        channels: await Get.serverChannels(server.id),
      });

      new Logger('WebSocket').info(
        `Channel(${channel.id}) deleted in server(${server.id}) by User(${operator.id})`,
      );
    } catch (error) {
      // Emit error data (only to the user)
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `刪除頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'DELETECHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('WebSocket').error(
        'Error deleting channel: ' + error.error_message,
      );
    }
  },
};

module.exports = { ...channelHandler };
