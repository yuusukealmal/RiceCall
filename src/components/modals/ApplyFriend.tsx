/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import applyFriend from '@/styles/popups/applyFriend.module.css';

// Types
import { FriendApplication, PopupType, SocketServerEvent, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/default';

interface ApplyFriendModalProps {
  userId: string;
  targetId: string;
}

const ApplyFriendModal: React.FC<ApplyFriendModalProps> = React.memo(
  (initialData: ApplyFriendModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // State
    const [user, setUser] = useState<User>(createDefault.user());
    const [target, setTarget] = useState<User>(createDefault.user());
    const [application, setApplication] = useState<FriendApplication>(
      createDefault.friendApplication(),
    );

    // Variables
    const { userId, targetId } = initialData;
    const { friendGroups: userFriendGroups = [] } = user;
    const { name: targetName, avatar: targetAvatar } = target;
    const { description: applicationDescription } = application;

    // Handlers
    const handleOpenSuccessDialog = () => {
      ipcService.popup.open(PopupType.DIALOG_SUCCESS);
      ipcService.initialData.onRequest(PopupType.DIALOG_SUCCESS, {
        title: lang.tr.friendApply,
        submitTo: PopupType.DIALOG_SUCCESS,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_SUCCESS, () => {
        handleClose();
      });
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    const handleCreateFriendApplication = (application: FriendApplication) => {
      // socket?.send.createFriendApplication({});
    };

    const handleUserUpdate = (data: Partial<User> | null) => {
      if (!data) data = createDefault.user();
      if (data.id === userId) setUser((prev) => ({ ...prev, ...data }));
      if (data.id === targetId) setTarget((prev) => ({ ...prev, ...data }));
    };

    const handleFriendApplicationUpdate = (
      data: Partial<FriendApplication> | null,
    ) => {
      if (!data) data = createDefault.friendApplication();
      setApplication((prev) => ({ ...prev, ...data }));
    };

    // Effects
    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.USER_UPDATE]: handleUserUpdate,
        // [SocketServerEvent.FRIEND_APPLICATION_UPDATE]: handleFriendApplicationUpdate,
      };
      const unsubscribe: (() => void)[] = [];

      Object.entries(eventHandlers).map(([event, handler]) => {
        const unsub = socket.on[event as SocketServerEvent](handler);
        unsubscribe.push(unsub);
      });

      return () => {
        unsubscribe.forEach((unsub) => unsub());
      };
    }, [socket]);

    useEffect(() => {
      if (!socket || !userId || !targetId) return;
      if (refreshRef.current) return;
      socket.send.refreshUser({ userId: userId });
      socket.send.refreshUser({ userId: targetId });
      socket.send.refreshFriendApplication({
        senderId: userId,
        receiverId: targetId,
      });
      refreshRef.current = true;
    }, [socket, userId, targetId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={`${popup['popupBody']}`}>
          <div className={applyFriend['body']}>
            <div className={popup['label']}>{lang.tr.friendLabel}</div>
            <div className={applyFriend['headerBox']}>
              <div className={applyFriend['avatarWrapper']}>
                <div className={applyFriend['avatarPicture']} />
              </div>
              <div className={applyFriend['userInfoWrapper']}>
                <div className={applyFriend['userAccount']}>{targetName}</div>
                <div className={applyFriend['userName']}>{targetId}</div>
              </div>
            </div>
            <div className={applyFriend['split']} />
            <div className={applyFriend['contentBox']}>
              <div className={popup['label']}>{lang.tr.friendSelectGroup}</div>
              <div className={popup['inputBox']}>
                <select
                  className={popup['select']}
                  onChange={(e) => {
                    // FIXME
                  }}
                >
                  {userFriendGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <div className={applyFriend['linkText']}>
                  {lang.tr.friendAddGroup}
                </div>
              </div>
              <div className={popup['label']}>{lang.tr.friendNote}</div>
              <div className={popup['inputBox']}>
                <textarea
                  rows={2}
                  onChange={(e) =>
                    setApplication((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className={applyFriend['noteText']}>
                {lang.tr.max120content}
              </div>
            </div>
          </div>
        </div>
        <div className={popup['popupFooter']}>
          <button
            className={`${popup['button']} ${
              !applicationDescription.trim() ? popup['disabled'] : ''
            }`}
            disabled={!applicationDescription.trim()}
            onClick={() => {
              handleCreateFriendApplication(application);
              handleOpenSuccessDialog();
            }}
          >
            {lang.tr.sendRequest}
          </button>
          <button className={popup['button']} onClick={() => handleClose()}>
            {lang.tr.cancel}
          </button>
        </div>
      </div>
    );
  },
);

ApplyFriendModal.displayName = 'ApplyFriendModal';

export default ApplyFriendModal;
