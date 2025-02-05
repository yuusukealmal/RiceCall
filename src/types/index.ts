export interface User {
  id: string, // UUID
  name: string, // Display name
  account: string,
  password: string,
  gender: UserGender,
  avatar?: string,
  level: number,
  createdAt: number,
  lastLoginAt?: number,
  state: UserState, // ["online" | "dnd" | "idle" | "gn"]
  currentChannelId: string | null,
}

export type UserGender = "Male" | "Female"
export type UserState = "online" | "dnd" | "idle" | "gn";
export type MessageType = "general" | "info"

export interface UserList {
  [userId: string]: User
}

export interface Server {
  id: string,
  name: string,
  icon: string,
  announcement: string,
  level: number,
  userIds: string[]
  channelIds: string[]
  createdAt: number,
  applications: {
    [userId: string]: string
  }
  permissions: {
    [userId: string]: number
  }
  nicknames: {
    [userId: string]: string
  }
  contributions: {
    [userId: string]: number
  }
  joinDate: {
    [userId: string]: number
  }
}
export interface ServerList {
  [serverId: string]: Server
}

export interface Channel {
  id: string,
  name: string,
  permission: string,
  isLobby: boolean,
  isCategory: boolean,
  userIds: string[],
  messageIds: string[],
  parentId: string | null
}
export interface ChannelList {
  [channelId: string]: Channel
}

export interface Message {
  id: string,
  senderId: string,
  content: string,
  timestamp: number,
  type: MessageType,
}

export interface MessageList {
  [messageId: string]: Message
}

export interface UserData {
  id: string,
  name: string,
  account: string,
  gender: string,
}

export interface MenuItem {
  id: string;
  label: string;
}