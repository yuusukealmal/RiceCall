/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import applyFriend from '@/styles/popups/applyFriend.module.css';

// Types
import { FriendApplication, FriendGroup, PopupType, User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';

// Utils
import { createDefault } from '@/utils/createDefault';

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
    const [userFriendGroups, setUserFriendGroups] = useState<FriendGroup[]>(
      createDefault.user().friendGroups || [],
    );
    const [targetName, setTargetName] = useState<User['name']>(
      createDefault.user().name,
    );
    const [targetAvatar, setTargetAvatar] = useState<User['avatar']>(
      createDefault.user().avatar,
    );
    const [applicationDescription, setApplicationDescription] = useState<
      FriendApplication['description']
    >(createDefault.friendApplication().description);

    // Variables
    const { userId, targetId } = initialData;

    // Handlers
    const handleCreateFriendApplication = (
      friendApplication: Partial<FriendApplication>,
      userId: User['id'],
      targetId: User['id'],
    ) => {
      if (!socket) return;
      socket.send.createFriendApplication({
        friendApplication,
        userId,
        targetId,
      });
    };

    const handleUserUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      if (data.id === userId) {
        setUserFriendGroups(data.friendGroups || []);
      }
      if (data.id === targetId) {
        setTargetName(data.name);
        setTargetAvatar(data.avatar);
      }
    };

    const handleFriendApplicationUpdate = (data: FriendApplication | null) => {
      if (!data) data = createDefault.friendApplication();
      setApplicationDescription(data.description);
    };

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

    // Effects
    useEffect(() => {
      if (!userId || !targetId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const user = await refreshService.user({ userId: userId });
        handleUserUpdate(user);
        const target = await refreshService.user({ userId: targetId });
        handleUserUpdate(target);
        const friendApplication = await refreshService.friendApplication({
          userId: userId,
          targetId: targetId,
        });
        handleFriendApplicationUpdate(friendApplication);
      };
      refresh();
    }, [userId, targetId]);

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
                  onChange={(e) => setApplicationDescription(e.target.value)}
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
              handleCreateFriendApplication(
                { description: applicationDescription },
                userId,
                targetId,
              );
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
