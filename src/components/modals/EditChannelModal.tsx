import React, { useEffect, useRef, useState } from 'react';

// CSS
import Popup from '@/styles/common/popup.module.css';
import editChannel from '@/styles/popups/editChannel.module.css';

// Types
import { Channel } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';

// Services
import { ipcService } from '@/services/ipc.service';
import { apiService } from '@/services/api.service';

// Utils
import { createDefault } from '@/utils/default';

interface EditChannelModalProps {
  userId: string;
  channelId: string;
}

const EditChannelModal: React.FC<EditChannelModalProps> = React.memo(
  (initialData: EditChannelModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // States
    const [channelName, setChannelName] = useState<Channel['name']>(
      createDefault.channel().name,
    );
    const [channelIsLobby, setChannelIsLobby] = useState<Channel['isLobby']>(
      createDefault.channel().isLobby,
    );
    const [channelVisibility, setChannelVisibility] = useState<
      Channel['visibility']
    >(createDefault.channel().visibility);

    // Variables
    const { userId, channelId } = initialData;

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleUpdateChannel = () => {
      if (!socket) return;
      socket.send.updateChannel({
        channel: {
          id: channelId,
          name: channelName,
          visibility: channelVisibility,
        },
        userId: userId,
      });
    };

    const handleChannelUpdate = (data: Channel | null) => {
      if (!data) data = createDefault.channel();
      setChannelName(data.name);
      setChannelIsLobby(data.isLobby);
      setChannelVisibility(data.visibility);
    };

    // Effects
    useEffect(() => {
      if (!channelId) return;
      if (refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const channel = await apiService.post('/refresh/channel', {
          channelId: channelId,
        });
        handleChannelUpdate(channel);
      };
      refresh();
    }, [channelId]);

    return (
      <div className={Popup['popupContainer']}>
        <div className={Popup['popupBody']}>
          <div className={editChannel['body']}>
            <div className={editChannel['inputGroup']}>
              <div className={Popup['inputBox']}>
                <div className={Popup['label']}>
                  {`${lang.tr.channel}${lang.tr.name}`}
                </div>
                <div className={Popup['input']}>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                </div>
              </div>
              {!channelIsLobby && (
                <div className={Popup['inputBox']}>
                  <div className={Popup['label']}>
                    {lang.tr.channelPermission}
                  </div>
                  <select
                    className={Popup['input']}
                    value={channelVisibility}
                    onChange={(e) =>
                      setChannelVisibility(
                        e.target.value as Channel['visibility'],
                      )
                    }
                  >
                    <option value="public">{lang.tr.channelPublic}</option>
                    <option value="private">{lang.tr.channelPrivate}</option>
                    <option value="readonly">{lang.tr.channelReadonly}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={Popup['popupFooter']}>
          <button
            className={Popup['button']}
            onClick={() => {
              handleUpdateChannel();
              handleClose();
            }}
          >
            {lang.tr.confirm}
          </button>
          <button className={Popup['button']} onClick={() => handleClose()}>
            {lang.tr.cancel}
          </button>
        </div>
      </div>
    );
  },
);

EditChannelModal.displayName = 'EditChannelModal';

export default EditChannelModal;
