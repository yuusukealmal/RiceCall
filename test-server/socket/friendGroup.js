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
    // Get database
    const friendGroups = (await db.get('friendGroups')) || {};
  },
  updateFriendGroup: async (io, socket, data) => {
    // Get database
    const friendGroups = (await db.get('friendGroups')) || {};
  },
  deleteFriendGroup: async (io, socket, data) => {
    // Get database
    const friendGroups = (await db.get('friendGroups')) || {};
  },
};

module.exports = { ...friendGroupHandler };
