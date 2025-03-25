import React, { useEffect, useRef, useState } from 'react';

// Types
import { Server } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// CSS
import popup from '@/styles/common/popup.module.css';
import setting from '@/styles/popups/editServer.module.css';

// Services
import refreshService from '@/services/refresh.service';
import ipcService from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/createDefault';

interface EditApplyModalProps {
  serverId: string;
}

const EditApplyModal: React.FC<EditApplyModalProps> = React.memo(
  (initialData: EditApplyModalProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // Refs
    const refreshRef = useRef(false);

    // Variables
    const { serverId } = initialData;

    // States
    const [isReceiveApply, setIsReceiveApply] = useState<boolean>(
      createDefault.server().receiveApply,
    );
    const [applyNotice, setApplyNotice] = useState<string>(
      createDefault.server().applyNotice,
    );

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleUpdateServer = (
      server: Partial<Server>,
      serverId: Server['id'],
    ) => {
      if (!socket) return;
      socket.send.updateServer({ server, serverId });
    };

    const handleServerUpdate = (data: Server | null) => {
      if (!data) data = createDefault.server();
      setIsReceiveApply(data.receiveApply);
      setApplyNotice(data.applyNotice);
    };

    // Effects
    useEffect(() => {
      if (!serverId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const server = await refreshService.server({
          serverId: serverId,
        });
        handleServerUpdate(server);
      };
      refresh();
    }, [serverId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={setting['body']}>
            <div className={popup['inputGroup']}>
              {/** Check Group */}
              <div className={setting['checkWrapper']} style={{ padding: 0 }}>
                <label className={setting['checkBox']}>
                  <input
                    type="checkbox"
                    className={setting['check']}
                    checked={isReceiveApply}
                    onChange={() => {
                      setIsReceiveApply(!isReceiveApply);
                    }}
                  />
                  <span>{lang.tr.isReceiveApply}</span>
                </label>
              </div>
              <div className={`${popup['inputBox']} ${popup['col']}`}>
                <div className={popup['label']}>{lang.tr.setApplyNotice}</div>
                <input
                  className={popup['input']}
                  type="text"
                  value={applyNotice}
                  onChange={(e) => {
                    setApplyNotice(e.target.value);
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
              handleUpdateServer(
                {
                  receiveApply: isReceiveApply,
                  applyNotice: applyNotice,
                },
                serverId,
              );
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

EditApplyModal.displayName = 'EditApplyModal';

export default EditApplyModal;
