/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';

// CSS
import Popup from '@/styles/common/popup.module.css';
import ApplyFriend from '@/styles/popups/applyFriend.module.css';

// Types
import { FriendApplication, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';

// Services
import { ipcService } from '@/services/ipc.service';

interface ApplyFriendModalProps {
  user: User;
  targetUser: User;
}

const ApplyFriendModal: React.FC<ApplyFriendModalProps> = React.memo(
  (initialData: ApplyFriendModalProps) => {
    const { user, targetUser } = initialData;
    if (!initialData) return;

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
      <div className={Popup['popupContainer']}>
        <div className={`${Popup['popupBody']}`}>
          <div className={ApplyFriend['body']}>
            <div className={Popup['label']}>{'您將添加以下聯絡人'}</div>
            <div className={ApplyFriend['headerBox']}>
              <div className={ApplyFriend['avatarWrapper']}>
                <div className={ApplyFriend['avatarPicture']} />
              </div>
              <div className={ApplyFriend['userInfoWrapper']}>
                <div className={ApplyFriend['userAccount']}>
                  {'{targetUser.username}'}
                </div>
                <div className={ApplyFriend['userName']}>
                  {'{targetUser.id}'}
                </div>
              </div>
            </div>
            <div className={ApplyFriend['split']} />
            <div className={ApplyFriend['contentBox']}>
              <div className={Popup['label']}>{'選擇分組：'}</div>
              <div className={Popup['inputBox']}>
                <select className={Popup['select']}>
                  <option>我的好友</option>
                  <option>閨密</option>
                  <option>好朋友</option>
                </select>
                <div className={ApplyFriend['linkText']}>{'添加分組'}</div>
              </div>
              <div className={Popup['label']}>{'附言：'}</div>
              <div className={Popup['inputBox']}>
                <textarea
                  rows={2}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className={ApplyFriend['noteText']}>
                {'最多只能輸入120個字元'}
              </div>
            </div>
          </div>
        </div>
        <div className={Popup['popupFooter']}>
          <button
            className={`${Popup['button']} ${
              !description.trim() ? Popup['disabled'] : ''
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
            className={Popup['button']}
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
