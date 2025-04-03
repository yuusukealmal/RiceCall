const { QuickDB } = require('quick.db');
const db = new QuickDB();

const clean = async () => {
  const users = await db.get('users');
  const badges = await db.get('badges');
  const userBadges = await db.get('userBadges');
  const userServers = await db.get('userServers');
  const servers = await db.get('servers');
  const channels = await db.get('channels');
  const channelRelations = await db.get('channelRelations');
  const friendGroups = await db.get('friendGroups');
  const members = await db.get('members');
  const memberApplications = await db.get('memberApplications');
  const friends = await db.get('friends');
  const friendApplications = await db.get('friendApplications');
  const messages = await db.get('messages');
  const directMessages = await db.get('directMessages');

  for (const user of Object.values(users)) {
    const ALLOWED_FIELDS = [
      'id',
      'name',
      'avatar',
      'avatarUrl',
      'signature',
      'country',
      'level',
      'vip',
      'xp',
      'requiredXp',
      'progress',
      'birthYear',
      'birthMonth',
      'birthDay',
      'status',
      'gender',
      'currentChannelId',
      'currentServerId',
      'lastActiveAt',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(user).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`users.${user.id}`, filteredData);
    console.log(`Cleaned user ${user.id}`);
  }
  console.log('All users cleaned!');

  for (const userServer of Object.values(userServers)) {
    const ALLOWED_FIELDS = [
      'id',
      'recent',
      'owned',
      'favorite',
      'userId',
      'serverId',
      'timestamp',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(userServer).filter(([key]) =>
        ALLOWED_FIELDS.includes(key),
      ),
    );
    await db.set(`userServers.${userServer.id}`, filteredData);
    console.log(`Cleaned userServer ${userServer.id}`);
  }
  console.log('All userServers cleaned!');

  for (const userBadge of Object.values(userBadges)) {
    const ALLOWED_FIELDS = ['id', 'userId', 'badgeId', 'createdAt'];
    const filteredData = Object.fromEntries(
      Object.entries(userBadge).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`userBadges.${userBadge.id}`, filteredData);
    console.log(`Cleaned userBadge ${userBadge.id}`);
  }
  console.log('All userBadges cleaned!');

  for (const server of Object.values(servers)) {
    const ALLOWED_FIELDS = [
      'id',
      'name',
      'avatar',
      'avatarUrl',
      'announcement',
      'applyNotice',
      'description',
      'displayId',
      'slogan',
      'level',
      'wealth',
      'receiveApply',
      'allowDirectMessage',
      'type',
      'visibility',
      'lobbyId',
      'ownerId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(server).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`servers.${server.id}`, filteredData);
    console.log(`Cleaned server ${server.id}`);
  }
  console.log('All servers cleaned!');

  for (const channel of Object.values(channels)) {
    const ALLOWED_FIELDS = [
      'id',
      'name',
      'order',
      'bitrate',
      'userLimit',
      'guestTextGapTime',
      'guestTextWaitTime',
      'guestTextMaxLength',
      'isRoot',
      'isLobby',
      'slowmode',
      'forbidText',
      'forbidGuestText',
      'forbidGuestUrl',
      'type',
      'visibility',
      'voiceMode',
      'categoryId',
      'serverId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(channel).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`channels.${channel.id}`, filteredData);
    console.log(`Cleaned channel ${channel.id}`);
  }
  console.log('All channels cleaned!');

  for (const friend of Object.values(friends)) {
    const ALLOWED_FIELDS = [
      'id',
      'isBlocked',
      'friendGroupId',
      'userId',
      'targetId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(friend).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`friends.${friend.id}`, filteredData);
    console.log(`Cleaned friend ${friend.id}`);
  }
  console.log('All friends cleaned!');

  for (const friendApplication of Object.values(friendApplications)) {
    const ALLOWED_FIELDS = [
      'id',
      'description',
      'applicationStatus',
      'senderId',
      'receiverId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(friendApplication).filter(([key]) =>
        ALLOWED_FIELDS.includes(key),
      ),
    );
    await db.set(`friendApplications.${friendApplication.id}`, filteredData);
    console.log(`Cleaned friendApplication ${friendApplication.id}`);
  }
  console.log('All friendApplications cleaned!');

  for (const friendGroup of Object.values(friendGroups)) {
    const ALLOWED_FIELDS = ['id', 'name', 'order', 'userId', 'createdAt'];
    const filteredData = Object.fromEntries(
      Object.entries(friendGroup).filter(([key]) =>
        ALLOWED_FIELDS.includes(key),
      ),
    );
    await db.set(`friendGroups.${friendGroup.id}`, filteredData);
    console.log(`Cleaned friendGroup ${friendGroup.id}`);
  }
  console.log('All friendGroups cleaned!');

  for (const member of Object.values(members)) {
    const ALLOWED_FIELDS = [
      'id',
      'nickname',
      'contribution',
      'lastMessageTime',
      'isBlocked',
      'permissionLevel',
      'userId',
      'serverId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(member).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`members.${member.id}`, filteredData);
    console.log(`Cleaned member ${member.id}`);
  }
  console.log('All members cleaned!');

  for (const memberApplication of Object.values(memberApplications)) {
    const ALLOWED_FIELDS = [
      'id',
      'description',
      'applicationStatus',
      'userId',
      'serverId',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(memberApplication).filter(([key]) =>
        ALLOWED_FIELDS.includes(key),
      ),
    );
    await db.set(`memberApplications.${memberApplication.id}`, filteredData);
    console.log(`Cleaned memberApplication ${memberApplication.id}`);
  }
  console.log('All memberApplications cleaned!');

  for (const message of Object.values(messages)) {
    const ALLOWED_FIELDS = [
      'id',
      'content',
      'type',
      'senderId',
      'receiverId',
      'channelId',
      'timestamp',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(message).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`messages.${message.id}`, filteredData);
    console.log(`Cleaned message ${message.id}`);
  }
  console.log('All messages cleaned!');

  for (const directMessage of Object.values(directMessages)) {
    const ALLOWED_FIELDS = ['id', 'content', 'userId', 'targetId', 'timestamp'];
    const filteredData = Object.fromEntries(
      Object.entries(directMessage).filter(([key]) =>
        ALLOWED_FIELDS.includes(key),
      ),
    );
    await db.set(`directMessages.${directMessage.id}`, filteredData);
    console.log(`Cleaned directMessage ${directMessage.id}`);
  }
  console.log('All directMessages cleaned!');

  for (const badge of Object.values(badges)) {
    const ALLOWED_FIELDS = [
      'id',
      'name',
      'imageUrl',
      'description',
      'createdAt',
    ];
    const filteredData = Object.fromEntries(
      Object.entries(badge).filter(([key]) => ALLOWED_FIELDS.includes(key)),
    );
    await db.set(`badges.${badge.id}`, filteredData);
    console.log(`Cleaned badge ${badge.id}`);
  }
  console.log('All badges cleaned!');

  // for (const channelRelation of Object.values(channelRelations)) {
  //   const ALLOWED_FIELDS = ['id', 'channelId', 'serverId', 'createdAt'];
  //   const filteredData = Object.fromEntries(
  //     Object.entries(channelRelation).filter(([key]) =>
  //       ALLOWED_FIELDS.includes(key),
  //     ),
  //   );
  //   await db.set(`channelRelations.${channelRelation.id}`, filteredData);
  //   console.log(`Cleaned channelRelation ${channelRelation.id}`);
  // }
  // console.log('All channelRelations cleaned!');
};

clean();
