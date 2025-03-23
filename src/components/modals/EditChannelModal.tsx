import React, { useEffect, useRef, useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import setting from '@/styles/popups/editServer.module.css';

// Types
import { Channel, Server } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';

// Utils
import { createDefault } from '@/utils/createDefault';

interface EditChannelModalProps {
  serverId: string;
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
    const { channelId, serverId } = initialData;

    // Handlers
    const handleUpdateChannel = (
      channel: Partial<Channel>,
      channelId: Channel['id'],
      serverId: Server['id'],
    ) => {
      if (!socket) return;
      socket.send.updateChannel({ channel, channelId, serverId });
    };

    const handleChannelUpdate = (data: Channel | null) => {
      if (!data) data = createDefault.channel();
      setChannelName(data.name);
      setChannelIsLobby(data.isLobby);
      setChannelVisibility(data.visibility);
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    // Effects
    useEffect(() => {
      if (!channelId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const channel = await refreshService.channel({ channelId: channelId });
        handleChannelUpdate(channel);
      };
      refresh();
    }, [channelId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={setting['body']}>
            <div className={popup['inputGroup']}>
              <div className={popup['inputBox']}>
                <div className={popup['label']}>
                  {`${lang.tr.channel}${lang.tr.name}`}
                </div>
                <div className={popup['input']}>
                  <input
                    type="text"
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                  />
                </div>
              </div>

              {!channelIsLobby && (
                <div className={popup['inputBox']}>
                  <div className={popup['label']}>
                    {lang.tr.channelPermission}
                  </div>
                  <select
                    className={popup['input']}
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
        <div className={popup['popupFooter']}>
          <button
            className={popup['button']}
            onClick={() => {
              handleUpdateChannel(
                {
                  id: channelId,
                  name: channelName,
                  visibility: channelVisibility,
                },
                channelId,
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

EditChannelModal.displayName = 'EditChannelModal';

export default EditChannelModal;
