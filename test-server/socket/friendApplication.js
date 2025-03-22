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

const friendApplicationHandler = {
  createFriendApplication: async (io, socket, data) => {
    // Get database
    const friendApplications = (await db.get('friendApplications')) || {};
  },
  updateFriendApplication: async (io, socket, data) => {
    // Get database
    const friendApplications = (await db.get('friendApplications')) || {};
  },
  deleteFriendApplication: async (io, socket, data) => {
    // Get database
    const friendApplications = (await db.get('friendApplications')) || {};
  },
};

module.exports = { ...friendApplicationHandler };
