/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import applyFriend from '@/styles/popups/applyFriend.module.css';

// Types
import { FriendApplication, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';

// Services
import { ipcService } from '@/services/ipc.service';

interface ApplyFriendModalProps {
  user: User | null;
  targetUser: User | null;
}

const ApplyFriendModal: React.FC<ApplyFriendModalProps> = React.memo(
  (initialData: ApplyFriendModalProps) => {
    // Variables
    const user = initialData.user || {
      id: '',
      name: '未知使用者',
      avatar: '',
      avatarUrl: '',
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
    };
    const targetUser = initialData.targetUser || {
      id: '',
      name: '未知使用者',
      avatar: '',
      avatarUrl: '',
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
    };
    const targetUserId = targetUser.id;
    const targetUserName = targetUser.name;
    const targetUserAvatarUrl = targetUser.avatarUrl;
    const friendGroups = user.friendGroups || [];

    // Socket
    const socket = useSocket();

    // State
    const [description, setDescription] = useState('');
    const [friendGroup, setFriendGroup] = useState('');

    const handleCreateFriendApplication = (application: FriendApplication) => {
      // socket?.send.createFriendApplication({});
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    return (
      <div className={popup['popupContainer']}>
        <div className={`${popup['popupBody']}`}>
          <div className={applyFriend['body']}>
            <div className={popup['label']}>{'您將添加以下聯絡人'}</div>
            <div className={applyFriend['headerBox']}>
              <div className={applyFriend['avatarWrapper']}>
                <div className={applyFriend['avatarPicture']} />
              </div>
              <div className={applyFriend['userInfoWrapper']}>
                <div className={applyFriend['userAccount']}>
                  {`${targetUserName}`}
                </div>
                <div className={applyFriend['userName']}>
                  {`${targetUserId}`}
                </div>
              </div>
            </div>
            <div className={applyFriend['split']} />
            <div className={applyFriend['contentBox']}>
              <div className={popup['label']}>{'選擇分組：'}</div>
              <div className={popup['inputBox']}>
                <select
                  className={popup['select']}
                  onChange={(e) => {
                    setFriendGroup(e.target.value);
                  }}
                >
                  {friendGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <div className={applyFriend['linkText']}>{'添加分組'}</div>
              </div>
              <div className={popup['label']}>{'附言：'}</div>
              <div className={popup['inputBox']}>
                <textarea
                  rows={2}
                  onChange={(e) => {
                    setDescription(e.target.value);
                  }}
                />
              </div>
              <div className={applyFriend['noteText']}>
                {'最多只能輸入120個字元'}
              </div>
            </div>
          </div>
        </div>
        <div className={popup['popupFooter']}>
          <button
            className={`${popup['button']} ${
              !description.trim() ? popup['disabled'] : ''
            }`}
            disabled={!description.trim()}
            onClick={() => {
              // handleCreateFriendApplication();
              handleClose();
            }}
          >
            {'傳送請求'}
          </button>
          <button
            className={popup['button']}
            onClick={() => {
              handleClose();
            }}
          >
            {'取消'}
          </button>
        </div>
      </div>
    );
  },
);

ApplyFriendModal.displayName = 'ApplyFriendModal';

export default ApplyFriendModal;
