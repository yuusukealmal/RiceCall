/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState } from 'react';

// Redux
import { useSelector } from 'react-redux';

// Components
import Modal from '@/components/Modal';
import Dialog from '@/components/modals/Dialog';

// Providers
import { useSocket } from '@/providers/SocketProvider';

// Types
import { Server } from '@/types';

// CSS
import Popup from '../../styles/common/popup.module.css';
import ApplyFriend from '../../styles/popups/applyFriend.module.css';

interface ApplyFriendModalProps {
  onClose: () => void;
  server?: Server;
}

const ApplyFriendModal: React.FC<ApplyFriendModalProps> = React.memo(
  ({ onClose, server }) => {
    // Socket
    const socket = useSocket();

    // State
    const [description, setDescription] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    // Redux
    const sessionId = useSelector(
      (state: { sessionToken: string }) => state.sessionToken,
    );

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Emit application event
      // socket?.emit('applyServerMembership', {
      //   sessionId,
      //   serverId: server?.id,
      //   application: {
      //     description: description.trim() || '',
      //     timestamp: Date.now(),
      //   },
      // });
      // Handle response
      // socket?.once(
      //   'applicationResponse',
      //   (response: { success: boolean; message: string }) => {
      //     if (response.success) {
      //       onClose();
      //     } else {
      //       setError(response.message);
      //     }
      //   },
      // );
      onClose();
    };

    return (
      <form className={Popup['popupContainer']} onSubmit={handleSubmit}>
        <div className={Popup['popupMessageWrapper']}>
          <div
            className={`${ApplyFriend['popupBody']} ${ApplyFriend['applyMember']}`}
          >
            <div className={ApplyFriend['header']}>
              <div>您將添加以下聯絡人</div>
              <div className={ApplyFriend['headerBox']}>
                <div className={ApplyFriend['avatarWrapper']}>
                  <div className={ApplyFriend['avatarPictureBorder']}></div>
                  <div className={ApplyFriend['avatarPicture']}></div>
                </div>
                <div className={ApplyFriend['userInfoBox']}>
                  <div className={ApplyFriend['userInfoAccount']}>
                    helloworld@raidcall.com.tw
                  </div>
                  <div className={ApplyFriend['userInfoName']}>使用者名稱</div>
                </div>
              </div>
            </div>
            <div className={ApplyFriend['body']}>
              <div className={ApplyFriend['split']}></div>
              <div className={ApplyFriend['userInfoBox']}>
                <div className={ApplyFriend['userInfoText']}>選擇分組：</div>
                <div className={ApplyFriend['userInfoButtonText']}>
                  添加分組
                </div>
                <div className={ApplyFriend['userInfoSelectBox']}>
                  <div className={ApplyFriend['userInfoSelectBorder']}>
                    <select className={ApplyFriend['userInfoSelect']}>
                      <option>我的好友</option>
                      <option>閨密</option>
                      <option>好朋友</option>
                    </select>
                    <div
                      className={ApplyFriend['userInfoSelectDropDownIcon']}
                    ></div>
                  </div>
                  <div className={ApplyFriend['userInfoTypeIcon']}></div>
                </div>
              </div>
              <div className={ApplyFriend['userInfoBox']}>
                <div className={ApplyFriend['userInfoText']}>附言：</div>
                <div className={Popup['inputBorder']}>
                  <textarea rows={2}></textarea>
                </div>
                <div className={ApplyFriend['userInfoNoteText']}>
                  最多只能輸入120個字元
                </div>
              </div>
            </div>
          </div>
          <div className={Popup['popupFooter']}>
            <button
              type="submit"
              className={`${Popup['button']} ${
                !description.trim() ? Popup['disabled'] : ''
              }`}
            >
              傳送請求
            </button>
            <button type="button" className={Popup['button']} onClick={onClose}>
              取消
            </button>
          </div>
        </div>
      </form>
    );
  },
);

ApplyFriendModal.displayName = 'ApplyFriendModal';

export default ApplyFriendModal;
