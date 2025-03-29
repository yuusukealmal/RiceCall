/* eslint-disable @typescript-eslint/no-require-imports */
// Constants
const { XP_SYSTEM } = require('../constant');
// Utils
const Logger = require('./logger');
const MapModule = require('./map');
const Get = require('./get');
const Set = require('./set');

const xpSystem = {
  contributionInterval: new Map(),
  elapsedTime: new Map(),
  timeFlag: new Map(),

  createMap: (socketId, intervalId) => {
    xpSystem.contributionInterval.set(socketId, intervalId);
  },

  deleteMap: (socketId = null) => {
    if (!socketId) return;
    if (!xpSystem.contributionInterval.has(socketId)) return;
    xpSystem.contributionInterval.delete(socketId);
  },

  getRequiredXP: (level) => {
    return Math.ceil(
      XP_SYSTEM.BASE_XP * Math.pow(XP_SYSTEM.GROWTH_RATE, level),
    );
  },

  setElapseTime: (userId) => {
    if (!userId) return 0;
    const elapsedTime = xpSystem.elapsedTime.get(userId) || 0;
    const joinTime = xpSystem.timeFlag.get(userId) || Date.now();
    const leftTime = Date.now();
    const newElapsedTime =
      (elapsedTime + leftTime - joinTime) % XP_SYSTEM.INTERVAL_MS;
    xpSystem.elapsedTime.set(userId, newElapsedTime);
    return newElapsedTime;
  },

  getElapseTime: (userId) => {
    if (!userId) return 0;
    const elapsedTime = xpSystem.elapsedTime.get(userId) || 0;
    const joinTime = Date.now();
    xpSystem.timeFlag.set(userId, joinTime);
    return elapsedTime;
  },

  setup: async (socket) => {
    try {
      // Validate inputs
      if (!socket) {
        throw new Error('Socket not provided');
      }
      const userId = MapModule.socketToUser.get(socket.id);
      if (!userId) {
        throw new Error(`UserId not found for socket(${socket.id})`);
      }

      // Restore elapsed time than calculate left time
      const elapsedTime = xpSystem.getElapseTime(userId);
      const leftTime = XP_SYSTEM.INTERVAL_MS - elapsedTime;

      // Run interval every XP_SYSTEM.INTERVAL_MS
      const timeout = setTimeout(async () => {
        await xpSystem.obtainXp(socket, userId);
        xpSystem.deleteMap(socket.id);
        xpSystem.setup(socket);
      }, leftTime);

      // Create map
      xpSystem.createMap(socket.id, timeout);

      new Logger('XPSystem').info(
        `Obtain XP interval set up for user(${userId}) with left time: ${leftTime}`,
      );
    } catch (error) {
      new Logger('XPSystem').error(
        `Error setting up contribution interval: ${error.message}`,
      );
    }
  },

  clear: (socket) => {
    try {
      if (!socket) {
        throw new Error('Socket not provided');
      }
      const userId = MapModule.socketToUser.get(socket.id);
      if (!userId) {
        throw new Error(`UserId not found for socket(${socket.id})`);
      }
      const interval = xpSystem.contributionInterval.get(socket.id);
      if (!interval) {
        throw new Error(`Interval not found for socket(${socket.id})`);
      }

      // Set elapsed time to map
      const elapsedTime = xpSystem.setElapseTime(userId);

      // Clear interval
      clearTimeout(interval);

      // Delete map
      xpSystem.deleteMap(socket.id);

      new Logger('XPSystem').info(
        `Obtain XP interval cleared for user(${userId}) with elapsed time: ${elapsedTime}`,
      );
    } catch (error) {
      new Logger('XPSystem').error(
        `Error clearing contribution interval: ${error.message}`,
      );
    }
  },

  obtainXp: async (socket, userId) => {
    try {
      const user = await Get.user(userId);
      if (!user) {
        new Logger('XPSystem').warn(
          `User(${userId}) not found, cannot obtain XP`,
        );
        return;
      }

      // Process XP and level
      user.xp += XP_SYSTEM.XP_PER_HOUR;

      let requiredXp = 0;
      while (true) {
        requiredXp = xpSystem.getRequiredXP(user.level);
        if (user.xp < requiredXp) break;
        user.level += 1;
        user.xp -= requiredXp;
      }

      const {
        user: setUser,
        member: setMember,
        server: setServer,
      } = require('./set');

      // Update user
      const userUpdate = {
        level: user.level,
        xp: user.xp,
        requiredXp: requiredXp,
        progress: user.xp / requiredXp,
      };
      await setUser(user.id, userUpdate);

      // Update member contribution if in a server
      if (user.currentServerId) {
        const member = await Get.member(user.id, user.currentServerId);
        if (!member) {
          new Logger('XPSystem').warn(
            `User(${user.id}) not found in server(${user.currentServerId}), cannot update contribution`,
          );
          return;
        }
        const server = await Get.server(user.currentServerId);
        if (!server) {
          new Logger('XPSystem').warn(
            `Server(${user.currentServerId}) not found, cannot obtain XP`,
          );
          return;
        }

        // Process member contribution and server wealth
        member.contribution += XP_SYSTEM.XP_PER_HOUR;
        server.wealth += XP_SYSTEM.XP_PER_HOUR;

        // Update member and server
        await setMember(member.id, { contribution: member.contribution });
        await setServer(server.id, { wealth: server.wealth });

        new Logger('XPSystem').info(
          `Server(${server.id}) wealth updated to: ${server.wealth}`,
        );
      }

      // Reset elapsed time
      xpSystem.elapsedTime.set(userId, 0);

      // Emit update to client
      socket.emit('userUpdate', userUpdate);

      new Logger('XPSystem').info(
        `User(${user.id}) obtained XP. Level: ${user.level}`,
      );
    } catch (error) {
      new Logger('XPSystem').error(
        `Error obtaining user(${userId}) XP: ${error.message}`,
      );
    }
  },
};

module.exports = { ...xpSystem };
