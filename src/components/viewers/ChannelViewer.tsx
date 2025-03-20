import React, { useState } from 'react';
import { Edit, Plus, Trash } from 'lucide-react';

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
import { ipcService } from '@/services/ipc.service';

interface CategoryTabProps {
  user: User;
  server: Server;
  category: Category;
  canEdit: boolean;
}

const CategoryTab: React.FC<CategoryTabProps> = React.memo(
  ({ user, server, category, canEdit }) => {
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
      isRoot: categoryIsRoot,
    } = category;
    const categoryChannels = serverChannels
      .filter((ch) => ch.type === 'channel')
      .filter((ch) => ch.categoryId === categoryId);

    // States
    const [expanded, setExpanded] = useState<boolean>(true);

    // Handlers
    const handleOpenEditChannel = (
      channelId: Channel['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_CHANNEL);
      ipcService.initialData.onRequest(PopupType.EDIT_CHANNEL, {
        channelId: channelId,
        userId: userId,
      });
    };

    const handleOpenCreateChannel = (
      serverId: Server['id'],
      parentId: Category['id'] | null,
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.CREATE_CHANNEL);
      ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
        serverId: serverId,
        parentId: parentId,
        userId: userId,
      });
    };

    const handleOpenWarning = () => {
      ipcService.popup.open(PopupType.DIALOG_WARNING);
      ipcService.initialData.onRequest(PopupType.DIALOG_WARNING, {
        iconType: 'warning',
        title: lang.tr.warningDeleteChannel,
        submitTo: PopupType.DIALOG_WARNING,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_WARNING, () =>
        handleDeleteChannel(),
      );
    };

    const handleDeleteChannel = () => {
      if (!socket) return;
      socket.send.deleteChannel({ channelId: categoryId, userId: userId });
    };

    return (
      <div key={categoryId}>
        {/* Category View */}
        <div
          className={`
            ${styles['channelTab']} 
            ${expanded ? styles['expanded'] : ''} 
            ${styles['public']}`}
          onClick={() => setExpanded(!expanded)}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'edit',
                icon: <Edit size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.edit,
                show: canEdit,
                onClick: () => handleOpenEditChannel(categoryId, userId),
              },
              {
                id: 'add',
                icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.add,
                show: canEdit && !categoryIsRoot,
                onClick: () =>
                  handleOpenCreateChannel(serverId, categoryId, userId),
              },
              {
                id: 'delete',
                icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.delete,
                show: canEdit,
                onClick: () => handleOpenWarning(),
              },
            ]);
          }}
        >
          <div className={styles['channelTabLable']}>{categoryName}</div>
        </div>

        {/* Expanded Sections */}
        {expanded && (
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
}

const ChannelTab: React.FC<ChannelTabProps> = React.memo(
  ({ user, server, channel, canEdit }) => {
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

    // Expanded Control
    const [expanded, setExpanded] = useState<boolean>(true);

    // Handlers
    const handleOpenEditChannel = (
      channelId: Channel['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.EDIT_CHANNEL);
      ipcService.initialData.onRequest(PopupType.EDIT_CHANNEL, {
        channelId: channelId,
        userId: userId,
      });
    };

    const handleOpenCreateChannel = (
      serverId: Server['id'],
      parentId: Channel['id'],
      userId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.CREATE_CHANNEL);
      ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
        serverId: serverId,
        parentId: parentId,
        userId: userId,
      });
    };

    const handleOpenWarning = () => {
      ipcService.popup.open(PopupType.DIALOG_WARNING);
      ipcService.initialData.onRequest(PopupType.DIALOG_WARNING, {
        iconType: 'warning',
        title: lang.tr.warningDeleteChannel,
        submitTo: PopupType.DIALOG_WARNING,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_WARNING, () =>
        handleDeleteChannel(),
      );
    };

    const handleDeleteChannel = () => {
      if (!socket) return;
      socket.send.deleteChannel({ channelId: channelId, userId: userId });
    };

    const handleJoinChannel = (
      channelId: Channel['id'],
      userId: User['id'],
    ) => {
      if (!socket) return;
      socket.send.connectChannel({ channelId: channelId, userId: userId });
    };

    return (
      <div key={channelId}>
        {/* Channel View */}
        <div
          className={`
            ${styles['channelTab']} 
            ${expanded ? styles['expanded'] : ''} 
            ${channelIsLobby ? styles['lobby'] : styles[channelVisibility]}  
            ${channelIsRoot ? '' : styles['subChannel']}`}
          onClick={() =>
            setExpanded(channelVisibility != 'readonly' ? !expanded : false)
          }
          onDoubleClick={() => {
            if (userInChannel) return;
            if (channelVisibility === 'readonly') return;
            handleJoinChannel(channelId, userId);
          }}
          onContextMenu={(e) => {
            contextMenu.showContextMenu(e.pageX, e.pageY, [
              {
                id: 'edit',
                icon: <Edit size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.edit,
                show: canEdit,
                onClick: () => handleOpenEditChannel(channelId, userId),
              },
              {
                id: 'add',
                icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.add,
                show: canEdit && !channelIsLobby && channelIsRoot,
                onClick: () =>
                  handleOpenCreateChannel(serverId, channelId, userId),
              },
              {
                id: 'delete',
                icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.delete,
                show: canEdit && !channelIsLobby,
                onClick: () => handleOpenWarning(),
              },
            ]);
          }}
        >
          <div className={styles['channelTabLable']}>{channelName}</div>
          <div className={styles['channelTabCount']}>
            {`(${channelMembers.length})`}
          </div>
          {userInChannel && !expanded && (
            <div className={styles['myLocationIcon']} />
          )}
        </div>
        {/* Expanded Sections */}
        {expanded && (
          <div className={styles['userList']}>
            {channelMembers
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((channelMember) => (
                <UserTab
                  key={channelMember.id}
                  user={user}
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
  user: User;
  channelMember: ServerMember;
  canEdit: boolean;
}

const UserTab: React.FC<UserTabProps> = React.memo(
  ({ user, channelMember, canEdit }) => {
    // Hooks
    const lang = useLanguage();
    const contextMenu = useContextMenu();

    // Variables
    const { id: userId } = user;
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
    const channelMemberGrade = Math.min(56, Math.ceil(channelMemberLevel / 5)); // 56 is max level
    const isCurrentUser = userId === channelMemberId;

    // Handlers
    const handleOpenApplyFriend = (
      userId: User['id'],
      targetId: User['id'],
    ) => {
      ipcService.popup.open(PopupType.APPLY_FRIEND);
      ipcService.initialData.onRequest(PopupType.APPLY_FRIEND, {
        userId: userId,
        targetId: targetId,
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
                id: 'kick',
                icon: <Trash size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.kick,
                show: canEdit && !isCurrentUser,
                onClick: () => {
                  // handleKickUser(user.id);
                },
              },
              {
                id: 'addFriend',
                icon: <Plus size={14} className="w-5 h-5 mr-2" />,
                label: lang.tr.addFriend,
                show: canEdit && !isCurrentUser,
                onClick: () =>
                  handleOpenApplyFriend(userId, channelMemberUserId),
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
}

const ChannelViewer: React.FC<ChannelViewerProps> = ({
  user,
  server,
  member,
  currentChannel,
}) => {
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

  // Handlers
  const handleOpenCreateChannel = (
    serverId: Server['id'],
    userId: User['id'],
  ) => {
    ipcService.popup.open(PopupType.CREATE_CHANNEL);
    ipcService.initialData.onRequest(PopupType.CREATE_CHANNEL, {
      serverId: serverId,
      parentId: null,
      userId: userId,
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
        <div className={styles['currentChannelText']}>{currentChannelName}</div>
      </div>
      {/* Mic Queue */}
      {currentChannelVoiceMode === 'queue' && (
        <>
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
        </>
      )}
      {/* Saperator */}
      <div className={styles['saperator-2']} />
      {/* All Channels */}
      <div
        className={styles['sectionTitle']}
        onContextMenu={(e) => {
          contextMenu.showContextMenu(e.pageX, e.pageY, [
            {
              id: 'addChannel',
              icon: <Plus size={14} className="w-5 h-5 mr-2" />,
              label: lang.tr.add,
              show: canEdit,
              onClick: () => handleOpenCreateChannel(serverId, userId),
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
                category={item}
                canEdit={canEdit}
              />
            ) : (
              <ChannelTab
                key={item.id}
                user={user}
                server={server}
                channel={item}
                canEdit={canEdit}
              />
            ),
          )}
      </div>
    </>
  );
};

ChannelViewer.displayName = 'ChannelViewer';

export default ChannelViewer;
