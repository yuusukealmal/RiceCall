import React, { useEffect, useRef, useState } from 'react';

// Types
import { Member } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// CSS
import popup from '@/styles/common/popup.module.css';
import addChannel from '@/styles/popups/addChannel.module.css';

// Services
import refreshService from '@/services/refresh.service';
import ipcService from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/createDefault';

interface EditMemberModalProps {
  userId: string;
  serverId: string;
}

const EditMemberModal: React.FC<EditMemberModalProps> = React.memo(
  (initialData: EditMemberModalProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // Refs
    const refreshRef = useRef(false);

    // Variables
    const { userId, serverId } = initialData;

    // States
    const [memberNickname, setMemberNickname] = useState(
      createDefault.member().nickname,
    );

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleUpdateMember = (member: Partial<Member>) => {
      if (!socket) return;
      socket.send.updateMember({
        member: member,
        userId: userId,
      });
    };

    const handleMemberUpdate = (data: Member | null) => {
      if (!data) data = createDefault.member();
      setMemberNickname(data.nickname);
    };

    // Effects
    useEffect(() => {
      if (!userId || !serverId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const member = await refreshService.member({
          userId: userId,
          serverId: serverId,
        });
        handleMemberUpdate(member);
      };
      refresh();
    }, [userId, serverId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={addChannel['body']}>
            <div className={addChannel['inputGroup']}>
              <div className={popup['inputBox']}>
                <div className={popup['label']}>{lang.tr.nickname}</div>
                <input
                  className={popup['input']}
                  type="text"
                  value={memberNickname || ''}
                  onChange={(e) => {
                    setMemberNickname(e.target.value);
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
              handleUpdateMember({
                nickname: memberNickname,
              });
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

EditMemberModal.displayName = 'EditMemberModal';

export default EditMemberModal;
