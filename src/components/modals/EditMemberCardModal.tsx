/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// Types
import { Channel, Member, SocketServerEvent, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// CSS
import popup from '@/styles/common/popup.module.css';
import addChannel from '@/styles/popups/addChannel.module.css';

// Services
import { ipcService } from '@/services/ipc.service';
import { apiService } from '@/services/api.service';
// Utils
import { createDefault } from '@/utils/default';

interface EditMemberCardModalProps {
  member: Member & User;
}

const EditMemberCardModal: React.FC<EditMemberCardModalProps> = React.memo(
  (initialData: EditMemberCardModalProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // Variables
    const { member } = initialData;

    // States
    const [nickname, setNickname] = useState(member.nickname);

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleChangeMemberCard = (member: Member, nickname: string) => {
      if (!socket || member.nickname === nickname) return;

      socket.send.updateMember({
        member: {
          ...(member as Member),
          nickname,
        },
        userId: member.userId,
        action: 'nickname',
      });
    };

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={addChannel['body']}>
            <div className={addChannel['inputGroup']}>
              <div className={popup['inputBox']}>
                <div className={popup['label']}>{lang.tr.nickname}</div>
                <input
                  placeholder={member.name}
                  className={popup['input']}
                  type="text"
                  value={nickname || ''}
                  onChange={(e) => {
                    setNickname(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className={popup['popupFooter']}>
          <button
            className={`${popup['button']}`}
            onClick={() => {
              const updatedNickname = nickname || member.name;
              handleChangeMemberCard(member, updatedNickname);
              handleClose();
            }}
          >
            {lang.tr.confirm}
          </button>
          <button className={popup['button']} onClick={() => handleClose()}>
            {lang.tr.cancel}
          </button>
        </div>
      </div>
    );
  },
);

EditMemberCardModal.displayName = 'EditMemberCardModal';

export default EditMemberCardModal;
