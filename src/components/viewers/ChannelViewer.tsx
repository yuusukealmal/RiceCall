import React, {
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';

// CSS
import styles from '@/styles/serverPage.module.css';
import grade from '@/styles/common/grade.module.css';
import permission from '@/styles/common/permission.module.css';

// Types
import {
  PopupType,
  ServerMember,
  Channel,
  Server,
  User,
  Member,
  Category,
} from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';
import { useContextMenu } from '@/providers/ContextMenuProvider';

// Components
import BadgeViewer from '@/components/viewers/BadgeViewer';

// Services
import ipcService from '@/services/ipc.service';

interface CategoryTabProps {
  user: User;
  server: Server;
  category: Category;
  canEdit: boolean;
  isExpanded: boolean;
  onExpand: () => void;
}

const CategoryTab: React.FC<CategoryTabProps> = React.memo(
  ({ user, server, category, canEdit, isExpanded, onExpand }) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();
    const contextMenu = useContextMenu();

    // Variables
    const { channels: serverChannels = [] } = server;
    const { id: userId } = user;
    const { id: serverId } = server;
    const {
      id: categoryId,
      name: categoryName,
      visibility: categoryVisibility,
    } = category;
    const categoryChannels = serverChannels
      .filter((ch) => ch.type === 'channel')
      .filter((ch) => ch.categoryId === categoryId);

    // States
    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
      () => {
        const initialState: Record<string, boolean> = {};
        serverChannels.forEach((item) => {
          initialState[item.id] =
            item.type === 'channel' &&
            ('isLobby' in item ? item.isLobby : false);
        });
        return initialState;
      },
    );

    const toggleItem = (itemId: string) => {
      setExpandedItems((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    };

    // Check if user is in any child channel
    const hasUserInChildren = categoryChannels.some(
      (ch) => ch.id === user.currentChannelId,
    );

    // Handlers
    const handleOpenEditChannel = (
      channelId: Channel['id'],
      serverId: Server['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_CHANNEL);
      ipcService.initialData.onRequest(PopupType.EDIT_CHANNEL, {
        channelId,
        serverId,
      });
    };

    const handleOpenCreateChannel = (
      serverId: Server['id'],
      categoryId: Category['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.CREATE_CHANNEL);
      ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
        serverId,
        categoryId,
        userId,
      });
    };

    const handleOpenWarning = (message: string) => {
      ipcService.popup.open(PopupType.DIALOG_WARNING);
      ipcService.initialData.onRequest(PopupType.DIALOG_WARNING, {
        iconType: 'warning',
        title: message,
        submitTo: PopupType.DIALOG_WARNING,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_WARNING, () =>
        handleDeleteChannel(categoryId, serverId),
      );
    };

    const handleDeleteChannel = (
      channelId: Channel['id'],
      serverId: Server['id'],
    ) => {
      if (!socket) return;
      socket.send.deleteChannel({ channelId, serverId });
    };

    return (
      <div key={categoryId}>
        {/* Category View */}
        <div
          className={`
            ${styles['channelTab']} 
            ${isExpanded ? styles['expanded'] : ''} 
            ${styles[categoryVisibility]}
          `}
          onClick={onExpand}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'edit',
                label: lang.tr.edit,
                show: canEdit,
                onClick: () => handleOpenEditChannel(categoryId, serverId),
              },
              {
                id: 'add',
                label: lang.tr.add,
                show: canEdit,
                onClick: () =>
                  handleOpenCreateChannel(serverId, categoryId, userId),
              },
              {
                id: 'delete',
                label: lang.tr.delete,
                show: canEdit,
                onClick: () => handleOpenWarning(lang.tr.warningDeleteChannel),
              },
            ]);
          }}
        >
          <div className={styles['channelTabLable']}>{categoryName}</div>
          {!isExpanded && hasUserInChildren && (
            <div className={styles['myLocationIcon']} />
          )}
        </div>

        {/* Expanded Sections */}
        {isExpanded && (
          <div className={styles['channelList']}>
            {categoryChannels
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((channel) => (
                <ChannelTab
                  key={channel.id}
                  user={user}
                  server={server}
                  channel={channel}
                  canEdit={canEdit}
                  isExpanded={expandedItems[channel.id]}
                  onExpand={() => toggleItem(channel.id)}
                />
              ))}
          </div>
        )}
      </div>
    );
  },
);

CategoryTab.displayName = 'CategoryTab';

interface ChannelTabProps {
  user: User;
  server: Server;
  channel: Channel;
  canEdit: boolean;
  isExpanded: boolean;
  onExpand: () => void;
}

const ChannelTab: React.FC<ChannelTabProps> = React.memo(
  ({ user, server, channel, canEdit, isExpanded, onExpand }) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();
    const contextMenu = useContextMenu();

    // Variables
    const { id: userId } = user;
    const { id: serverId, members: serverMembers = [] } = server;
    const {
      id: channelId,
      name: channelName,
      isRoot: channelIsRoot,
      isLobby: channelIsLobby,
      visibility: channelVisibility,
    } = channel;
    const channelMembers = serverMembers.filter(
      (mb) => mb.currentChannelId === channelId,
    );
    const userInChannel = user.currentChannelId === channelId;
    const member = serverMembers.find((mb) => mb.userId === userId);
    const clickTimer = useRef<NodeJS.Timeout | null>(null);

    // Handlers
    const handleOpenEditChannel = (
      channelId: Channel['id'],
      serverId: Server['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_CHANNEL);
      ipcService.initialData.onRequest(PopupType.EDIT_CHANNEL, {
        channelId,
        serverId,
      });
    };

    const handleOpenCreateChannel = (
      serverId: Server['id'],
      categoryId: Channel['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.CREATE_CHANNEL);
      ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
        serverId,
        categoryId,
        userId,
      });
    };

    const handleOpenWarning = (message: string) => {
      ipcService.popup.open(PopupType.DIALOG_WARNING);
      ipcService.initialData.onRequest(PopupType.DIALOG_WARNING, {
        iconType: 'warning',
        title: message,
        submitTo: PopupType.DIALOG_WARNING,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_WARNING, () =>
        handleDeleteChannel(channelId, serverId),
      );
    };

    const handleDeleteChannel = (
      channelId: Channel['id'],
      serverId: Server['id'],
    ) => {
      if (!socket) return;
      socket.send.deleteChannel({ channelId, serverId });
    };

    const handleJoinChannel = (
      userId: User['id'],
      channelId: Channel['id'],
    ) => {
      if (!socket) return;
      socket.send.connectChannel({ userId, channelId });
      onExpand();
    };

    const handleClick = () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;

        if (
          !userInChannel &&
          channelVisibility !== 'readonly' &&
          !(
            channelVisibility === 'private' &&
            (!member || member.permissionLevel < 3)
          ) &&
          !(
            channelVisibility === 'member' &&
            (!member || member.permissionLevel < 2)
          )
        ) {
          handleJoinChannel(userId, channelId);
        }
      } else {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null;
          onExpand();
        }, 200);
      }
    };

    return (
      <div key={channelId}>
        {/* Channel View */}
        <div
          className={`
            ${styles['channelTab']} 
            ${isExpanded ? styles['expanded'] : ''} 
            ${channelIsLobby ? styles['lobby'] : styles[channelVisibility]}  
            ${channelIsRoot ? '' : styles['subChannel']}
          `}
          onClick={handleClick}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'edit',
                label: lang.tr.edit,
                show: canEdit,
                onClick: () => handleOpenEditChannel(channelId, serverId),
              },
              {
                id: 'add',
                label: lang.tr.add,
                show: canEdit && !channelIsLobby && !channel.categoryId,
                onClick: () =>
                  handleOpenCreateChannel(serverId, channelId, userId),
              },
              {
                id: 'delete',
                label: lang.tr.delete,
                show: canEdit && !channelIsLobby,
                onClick: () => handleOpenWarning(lang.tr.warningDeleteChannel),
              },
            ]);
          }}
        >
          <div className={styles['channelTabLable']}>{channelName}</div>
          {channelVisibility !== 'readonly' && (
            <div className={styles['channelTabCount']}>
              {`(${channelMembers.length})`}
            </div>
          )}
          {userInChannel && !isExpanded && (
            <div className={styles['myLocationIcon']} />
          )}
        </div>
        {/* Expanded Sections */}
        {isExpanded && (
          <div className={styles['userList']}>
            {channelMembers
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((channelMember) => (
                <UserTab
                  key={channelMember.id}
                  member={member as Member}
                  channelMember={channelMember}
                  canEdit={canEdit}
                />
              ))}
          </div>
        )}
      </div>
    );
  },
);

ChannelTab.displayName = 'ChannelTab';

interface UserTabProps {
  member: Member;
  channelMember: ServerMember;
  canEdit: boolean;
}

const UserTab: React.FC<UserTabProps> = React.memo(
  ({ member, channelMember, canEdit }) => {
    // Hooks
    const lang = useLanguage();
    const contextMenu = useContextMenu();

    // Variables
    const { userId } = member;
    const {
      id: channelMemberId,
      name: channelMemberName,
      permissionLevel: channelMemberPermission,
      nickname: channelMemberNickname,
      userId: channelMemberUserId,
      level: channelMemberLevel,
      gender: channelMemberGender,
      badges: channelMemberBadges = [],
    } = channelMember;
    const channelMemberGrade = Math.min(56, Math.ceil(channelMemberLevel / 5)); // 56 is max leve
    const isCurrentUser = userId === channelMemberUserId;
    const isTargetPermissionHigher =
      channelMemberPermission > member.permissionLevel;

    // Handlers
    const handleOpenApplyFriend = (
      userId: User['id'],
      targetId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.APPLY_FRIEND);
      ipcService.initialData.onRequest(PopupType.APPLY_FRIEND, {
        userId,
        targetId,
      });
    };

    const handleOpenEditMember = (
      serverId: Server['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_MEMBER);
      ipcService.initialData.onRequest(PopupType.EDIT_MEMBER, {
        serverId,
        userId,
      });
    };

    return (
      <div key={channelMemberId}>
        {/* User View */}
        <div
          className={`${styles['userTab']}`}
          onDoubleClick={(e) => {
            contextMenu.showUserInfoBlock(e.pageX, e.pageY, channelMember);
          }}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'send-message',
                label: '傳送即時訊息',
                onClick: () => {},
                show: !isCurrentUser,
              },
              {
                id: 'view-profile',
                label: '檢視個人檔案',
                onClick: () => {},
                show: !isCurrentUser,
              },
              {
                id: 'add-friend',
                label: '新增好友',
                onClick: () => {},
                show: !isCurrentUser,
              },
              {
                id: 'refuse-voice',
                label: '拒聽此人語音',
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'edit-nickname',
                label: '修改群名片',
                onClick: () =>
                  handleOpenEditMember(
                    channelMember.serverId,
                    channelMemberUserId,
                  ),
                show: isCurrentUser || !isTargetPermissionHigher,
              },
              {
                id: 'separator',
                label: '',
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'move-to-my-channel',
                label: lang.tr.moveToMyChannel,
                // onClick: () => handleUserMove(),
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'separator',
                label: '',
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'mute-voice',
                label: '禁止此人語音',
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'mute-text',
                label: '禁止文字',
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'kick',
                label: lang.tr.kickOut,
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'block',
                label: lang.tr.block,
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'separator',
                label: '',
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
              {
                id: 'member-management',
                label: lang.tr.memberManagement,
                onClick: () => {},
                show: !isCurrentUser && !isTargetPermissionHigher,
              },
            ]);
          }}
        >
          <div
            className={`${styles['userState']} ${
              false ? styles['unplay'] : ''
            }`}
          />
          <div
            className={`${styles['userIcon']} ${
              permission[channelMemberGender]
            } ${permission[`lv-${channelMemberPermission}`]}`}
          />
          <div className={styles['userTabName']}>
            {channelMemberNickname || channelMemberName}
          </div>
          <div
            className={`${styles['userGrade']} ${
              grade[`lv-${channelMemberGrade}`]
            }`}
          />
          <BadgeViewer badges={channelMemberBadges} maxDisplay={3} />
          {isCurrentUser && <div className={styles['myLocationIcon']} />}
        </div>
      </div>
    );
  },
);

UserTab.displayName = 'UserTab';

interface ChannelViewerProps {
  user: User;
  server: Server;
  member: Member;
  currentChannel: Channel;
  onLocateUser?: () => void;
}

// Add ref interface
export interface ChannelViewerRef {
  locateUser: () => void;
}

const ChannelViewer = forwardRef<ChannelViewerRef, ChannelViewerProps>(
  ({ user, server, member, currentChannel, onLocateUser }, ref) => {
    // Hooks
    const lang = useLanguage();
    const contextMenu = useContextMenu();

    // Variables
    const connectStatus = 3;
    const { id: userId } = user;
    const { id: serverId, channels: serverChannels = [] } = server;
    const { permissionLevel: memberPermission } = member;
    const { name: currentChannelName, voiceMode: currentChannelVoiceMode } =
      currentChannel;
    const canEdit = memberPermission >= 5;

    const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
      () => {
        const initialState: Record<string, boolean> = {};
        serverChannels.forEach((item) => {
          initialState[item.id] =
            item.type === 'channel' &&
            ('isLobby' in item ? item.isLobby : false);
        });
        return initialState;
      },
    );

    const toggleItem = (itemId: string) => {
      setExpandedItems((prev) => ({
        ...prev,
        [itemId]: !prev[itemId],
      }));
    };

    const expandItem = (itemId: string) => {
      setExpandedItems((prev) => ({
        ...prev,
        [itemId]: true,
      }));
    };

    const locateUser = useCallback(() => {
      if (!user.currentChannelId) return;

      // Find user's current channel
      const userChannel = serverChannels.find(
        (ch) => ch.id === user.currentChannelId,
      );
      if (!userChannel) return;

      // If channel has category, expand the category first
      if (userChannel.type === 'channel' && userChannel.categoryId) {
        // Find and expand parent category
        const parentCategory = serverChannels.find(
          (ch) => ch.type === 'category' && ch.id === userChannel.categoryId,
        );
        if (parentCategory) {
          expandItem(parentCategory.id);
        }
      }

      // Expand the user's channel
      expandItem(userChannel.id);

      // Call parent's onLocateUser if provided
      onLocateUser?.();
    }, [user.currentChannelId, serverChannels, onLocateUser]);

    // Expose locateUser method
    useImperativeHandle(ref, () => ({
      locateUser,
    }));

    // Handlers
    const handleCreateRootChannel = () => {
      ipcService.popup.open(PopupType.CREATE_CHANNEL);
      ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
        serverId,
        categoryId: null,
        userId,
      });
    };

    return (
      <>
        {/* Current Channel */}
        <div className={styles['currentChannelBox']}>
          <div
            className={`${styles['currentChannelIcon']} ${
              styles[`status${connectStatus}`]
            }`}
          />
          <div className={styles['currentChannelText']}>
            {currentChannelName}
          </div>
        </div>
        {currentChannelVoiceMode === 'queue' && (
          <>
            {/* Mic Queue */}
            <div className={styles['sectionTitle']}>{lang.tr.micOrder}</div>
            <div className={styles['micQueueBox']}>
              <div className={styles['userList']}>
                {/* {micQueueUsers.map((user) => (
              <UserTab
                key={user.id}
                user={user}
                server={server}
                mainUser={user}
              />
            ))} */}
              </div>
            </div>

            {/* Separator */}
            <div className={styles['saperator-2']} />
          </>
        )}

        {/* Channel List Title */}
        <div
          className={styles['sectionTitle']}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'addChannel',
                label: lang.tr.add,
                show: canEdit,
                onClick: handleCreateRootChannel,
              },
            ]);
          }}
        >
          {lang.tr.allChannel}
        </div>

        {/* Channel List */}
        <div className={styles['channelList']}>
          {serverChannels
            .filter((c) => c.isRoot)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((item) =>
              item.type === 'category' ? (
                <CategoryTab
                  key={item.id}
                  user={user}
                  server={server}
                  category={item as Category}
                  canEdit={canEdit}
                  isExpanded={expandedItems[item.id]}
                  onExpand={() => toggleItem(item.id)}
                />
              ) : (
                <ChannelTab
                  key={item.id}
                  user={user}
                  server={server}
                  channel={item}
                  canEdit={canEdit}
                  isExpanded={expandedItems[item.id]}
                  onExpand={() => toggleItem(item.id)}
                />
              ),
            )}
        </div>
      </>
    );
  },
);

ChannelViewer.displayName = 'ChannelViewer';

export default ChannelViewer;
