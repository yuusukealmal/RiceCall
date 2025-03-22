/* eslint-disable @typescript-eslint/no-require-imports */
const { QuickDB } = require('quick.db');
const db = new QuickDB();
const fs = require('fs').promises;
const path = require('path');
// Constants
const {
  UPLOADS_DIR,
  MIME_TYPES,
  CLEANUP_INTERVAL_MS,
  SERVER_AVATAR_DIR,
} = require('../constant');
// Utils
const Logger = require('./logger');

const clean = {
  setupCleanupInterval: async () => {
    try {
      // Ensure uploads directory exists
      await fs.mkdir(UPLOADS_DIR, { recursive: true });

      // Run cleanup
      setInterval(cleanupUnusedAvatars, CLEANUP_INTERVAL_MS);

      // Run initial cleanup
      await cleanupUnusedAvatars();
    } catch (error) {
      new Logger('Cleanup').error(
        `Error setting up cleanup interval: ${error.message}`,
      );
    }
  },
};

const cleanupUnusedAvatars = async () => {
  try {
    const files = await fs.readdir(SERVER_AVATAR_DIR);
    const servers = (await db.get('servers')) || {};
    const avatarMap = {};

    Object.values(servers).forEach(async (server) => {
      if (server.avatar) {
        const filePrefix = `upload-`;
        const fileName = server.avatar;
        avatarMap[`${filePrefix}${fileName}`.split('.').shift()] = true;
      }
    });

    const unusedFiles = files.filter(
      (file) =>
        Object.keys(MIME_TYPES).some((ext) => file.endsWith(ext)) &&
        !file.startsWith('__') &&
        !avatarMap[file.split('.').shift()],
    );

    for (const file of unusedFiles) {
      try {
        await fs.unlink(path.join(SERVER_AVATAR_DIR, file));
        new Logger('Cleanup').success(`Deleted unused avatar: ${file}`);
      } catch (error) {
        new Logger('Cleanup').error(
          `Error deleting unused avatar ${file}: ${error.message}`,
        );
      }
    }

    if (unusedFiles.length === 0) {
      new Logger('Cleanup').info('No unused avatars deleted');
    } else {
      new Logger('Cleanup').info(
        `Deleted ${unusedFiles.length} unused avatars`,
      );
    }
  } catch (error) {
    new Logger('Cleanup').error(`Avatar cleanup failed: ${error.message}`);
  }
};

module.exports = { ...clean };
