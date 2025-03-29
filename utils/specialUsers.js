/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const specialUsers = {
  eventStaffIds: [],
  officialIds: [],

  isEventStaff: function (userId) {
    return this.eventStaffIds.includes(userId);
  },

  isOfficial: function (userId) {
    return this.officialIds.includes(userId);
  },

  getSpecialPermissionLevel: function (userId) {
    if (this.isOfficial(userId)) {
      return 8;
    } else if (this.isEventStaff(userId)) {
      return 7;
    }
    return null;
  },

  addEventStaff: function (userId) {
    if (!this.eventStaffIds.includes(userId)) {
      this.eventStaffIds.push(userId);
    }
  },

  addOfficial: function (userId) {
    if (!this.officialIds.includes(userId)) {
      this.officialIds.push(userId);
    }
  },

  removeEventStaff: function (userId) {
    this.eventStaffIds = this.eventStaffIds.filter((id) => id !== userId);
  },

  removeOfficial: function (userId) {
    this.officialIds = this.officialIds.filter((id) => id !== userId);
  },
};

module.exports = specialUsers;
