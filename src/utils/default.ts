// import DefaultAvatar from '../../../public/logo_server_def.png';
import {
  User,
  Channel,
  Server,
  FriendApplication,
  MemberApplication,
  ServerMember,
  Permission,
  UserMember,
  Member,
  Friend,
  UserFriend,
} from '@/types';

// const defaultAvatar: string = await fetch(DefaultAvatar.src)
//   .then((res) => res.blob())
//   .then((blob) => {
//     const reader = new FileReader();
//     reader.onloadend = () => reader.result as string;
//     reader.readAsDataURL(blob);
//   })
//   .catch((err) => console.error('預設圖片讀取失敗:', err));

export const createDefault = {
  user: (overrides: Partial<User> = {}): User => ({
    id: '',
    name: '',
    avatar: `${Date.now()}`,
    avatarUrl: 'http://localhost:4500/images/userAvatars/',
    signature: '',
    status: 'online',
    gender: 'Male',
    level: 0,
    xp: 0,
    requiredXp: 0,
    progress: 0,
    currentChannelId: '',
    currentServerId: '',
    lastActiveAt: 0,
    createdAt: 0,
    ...overrides,
  }),

  channel: (overrides: Partial<Channel> = {}): Channel => ({
    id: '',
    name: '',
    type: 'channel',
    visibility: 'public',
    voiceMode: 'free',
    chatMode: 'free',
    isLobby: false,
    isRoot: false,
    slowmode: false,
    bitrate: 64000,
    userLimit: 0,
    order: 0,
    serverId: '',
    categoryId: '',
    createdAt: 0,
    ...overrides,
  }),

  server: (overrides: Partial<Server> = {}): Server => ({
    id: '',
    name: '',
    avatar: `${Date.now()}`,
    avatarUrl: 'http://localhost:4500/images/serverAvatars/',
    announcement: '',
    description: '',
    slogan: '',
    type: 'other',
    visibility: 'public',
    allowDirectMessage: true,
    level: 0,
    wealth: 0,
    displayId: '',
    lobbyId: '',
    ownerId: '',
    createdAt: 0,
    ...overrides,
  }),

  friend: (overrides: Partial<Friend> = {}): Friend => ({
    isBlocked: false,
    friendGroupId: '',
    user1Id: '',
    user2Id: '',
    createdAt: 0,
    ...overrides,
  }),

  userFriend: (overrides: Partial<UserFriend> = {}): UserFriend => ({
    ...createDefault.friend(),
    ...createDefault.user(),
    ...overrides,
  }),

  member: (overrides: Partial<Member> = {}): Member => ({
    id: '',
    isBlocked: false,
    nickname: null,
    contribution: 0,
    permissionLevel: Permission.Guest,
    userId: '',
    serverId: '',
    createdAt: 0,
    ...overrides,
  }),

  userMember: (overrides: Partial<UserMember> = {}): UserMember => ({
    ...createDefault.member(),
    ...createDefault.server(),
    ...overrides,
  }),

  serverMember: (overrides: Partial<ServerMember> = {}): ServerMember => ({
    ...createDefault.member(),
    ...createDefault.user(),
    ...overrides,
  }),

  friendApplication: (
    overrides: Partial<FriendApplication> = {},
  ): FriendApplication => ({
    description: '',
    senderId: '',
    receiverId: '',
    ...createDefault.user(),
    ...overrides,
  }),

  memberApplication: (
    overrides: Partial<MemberApplication> = {},
  ): MemberApplication => ({
    description: '',
    userId: '',
    serverId: '',
    ...createDefault.user(),
    ...overrides,
  }),
};
