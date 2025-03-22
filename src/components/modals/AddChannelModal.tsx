import React, { useEffect, useRef, useState } from 'react';

// Types
import { Channel } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// CSS
import popup from '@/styles/common/popup.module.css';
import addChannel from '@/styles/popups/addChannel.module.css';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';

// Utils
import { createDefault } from '@/utils/default';

interface AddChannelModalProps {
  userId: string;
  categoryId: string | null;
  serverId: string;
}

const AddChannelModal: React.FC<AddChannelModalProps> = React.memo(
  (initialData: AddChannelModalProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // Refs
    const refreshRef = useRef(false);

    // States
    const [parentName, setParentName] = useState<Channel['name']>(
      createDefault.channel().name,
    );
    const [channelName, setChannelName] = useState<Channel['name']>(
      createDefault.channel().name,
    );

    // Variables
    const { userId, categoryId, serverId } = initialData;
    const isRoot = !categoryId;

    // Handlers
    const handleCreateChannel = (channel: Partial<Channel>) => {
      if (!socket) return;
      socket.send.createChannel({ channel: channel, userId: userId });
    };

    const handleChannelUpdate = (data: Channel | null) => {
      if (!data) data = createDefault.channel();
      setParentName(data.name);
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    // Effects
    useEffect(() => {
      if (!categoryId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const channel = await refreshService.channel({ channelId: categoryId });
        handleChannelUpdate(channel);
      };
      refresh();
    }, [categoryId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={popup['popupBody']}>
          <div className={addChannel['body']}>
            <div className={addChannel['inputGroup']}>
              <div className={popup['inputBox']}>
                <div className={popup['label']}>{lang.tr.parentChannel}</div>
                <input
                  className={popup['input']}
                  type="text"
                  value={parentName}
                  disabled
                />
              </div>
              <div className={popup['inputBox']}>
                <div className={popup['label']}>{lang.tr.channelName}</div>
                <input
                  className={popup['input']}
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>
        </div>
        <div className={popup['popupFooter']}>
          <button
            className={`${popup['button']} ${
              !channelName.trim() ? popup['disabled'] : ''
            }`}
            disabled={!channelName.trim()}
            onClick={() => {
              handleCreateChannel({
                name: channelName,
                isRoot: isRoot,
                categoryId: categoryId,
                serverId: serverId,
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

AddChannelModal.displayName = 'CreateChannelModal';

export default AddChannelModal;
