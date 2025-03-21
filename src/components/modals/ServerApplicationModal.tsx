/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// CSS
import Popup from '@/styles/common/popup.module.css';
import applyMember from '@/styles/popups/serverApplication.module.css';

// Types
import { PopupType, Server, MemberApplication } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';
import { useSocket } from '@/providers/SocketProvider';

// Services
import { ipcService } from '@/services/ipc.service';
import { API_URL, apiService } from '@/services/api.service';

// Utils
import { createDefault } from '@/utils/default';

interface ServerApplicationModalProps {
  serverId: string;
  userId: string;
}

const ServerApplicationModal: React.FC<ServerApplicationModalProps> =
  React.memo((initialData: ServerApplicationModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // State
    const [serverName, setServerName] = useState<Server['name']>('');
    const [serverAvatar, setServerAvatar] = useState<Server['avatar']>('');
    const [serverDisplayId, setServerDisplayId] =
      useState<Server['displayId']>('');
    const [applicationDescription, setApplicationDescription] =
      useState<MemberApplication['description']>('');
    const avatarSrc = new URL(API_URL + serverAvatar, window.location.origin)
      .href;

    // Variables
    const { userId, serverId } = initialData;

    // Section Control
    const [section, setSection] = useState<number>(0);

    const handleCreatMemberApplication = (
      application: Partial<MemberApplication>,
    ) => {
      if (!socket) return;
      socket.send.createMemberApplication({ memberApplication: application });
    };

    const handleOpenSuccessDialog = () => {
      ipcService.popup.open(PopupType.DIALOG_SUCCESS);
      ipcService.initialData.onRequest(PopupType.DIALOG_SUCCESS, {
        title: lang.tr.serverApply,
        submitTo: PopupType.DIALOG_SUCCESS,
      });
      ipcService.popup.onSubmit(PopupType.DIALOG_SUCCESS, () => {
        setSection(1);
      });
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    const handleServerUpdate = (data: Server | null) => {
      if (!data) data = createDefault.server();
      setServerName(data.name);
      setServerDisplayId(data.displayId);
      setServerAvatar(data.avatar);
    };

    const handleMemberApplicationUpdate = (data: MemberApplication | null) => {
      if (!data) data = createDefault.memberApplication();
      setApplicationDescription(data.description);
    };

    // UseEffect
    useEffect(() => {
      if (!serverId || !userId) return;
      if (refreshRef.current) return;
      const refresh = async () => {
        const server = await apiService.post('/refresh/server', {
          serverId: serverId,
        });
        handleServerUpdate(server);
        const memberApplication = await apiService.post(
          '/refresh/memberApplication',
          {
            senderId: userId,
            receiverId: serverId,
          },
        );
        handleMemberApplicationUpdate(memberApplication);
        refreshRef.current = true;
      };
      refresh();
    }, [serverId, userId]);

    switch (section) {
      // Member Application Form
      case 0:
        return (
          <div className={Popup['popupContainer']}>
            <div className={`${Popup['popupBody']}`}>
              <div className={applyMember['body']}>
                <div className={applyMember['headerBox']}>
                  <div className={applyMember['avatarWrapper']}>
                    <div
                      className={applyMember['avatarPicture']}
                      style={{
                        backgroundImage: `url(${avatarSrc}?t=${Date.now()})`,
                      }}
                    />
                  </div>
                  <div className={applyMember['serverInfoWrapper']}>
                    <div className={applyMember['serverName']}>
                      {serverName}
                    </div>
                    <div className={applyMember['serverId']}>
                      {`ID: ${serverDisplayId}`}
                    </div>
                  </div>
                </div>
                <div className={Popup['label']}>
                  {lang.tr.serverApplyNotice}
                </div>
                <div className={applyMember['noteText']}>
                  {'{server.settings.applicationNote}'}
                </div>
                <div className={applyMember['split']} />
                <div className={applyMember['contentBox']}>
                  <div className={Popup['label']}>
                    {lang.tr.serverApplyDescription}
                  </div>
                  <div className={Popup['inputBox']}>
                    <textarea
                      rows={2}
                      onChange={(e) =>
                        setApplicationDescription(e.target.value)
                      }
                      value={applicationDescription}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className={Popup['popupFooter']}>
              <button
                type="submit"
                className={Popup['button']}
                onClick={() => {
                  handleCreatMemberApplication({
                    userId: userId,
                    serverId: serverId,
                    description: applicationDescription,
                  });
                  handleOpenSuccessDialog();
                }}
              >
                {lang.tr.submit}
              </button>
              <button
                type="button"
                className={Popup['button']}
                onClick={() => handleClose()}
              >
                {lang.tr.cancel}
              </button>
            </div>
          </div>
        );

      // Show Notification
      case 1:
        return (
          <div className={Popup['popupContainer']}>
            <div className={Popup['popupBody']}>
              <div className={applyMember['body']}>
                <div className={applyMember['headerBox']}>
                  <div className={applyMember['avatarWrapper']}>
                    <div
                      className={applyMember['avatarPicture']}
                      style={{ backgroundImage: `url(${serverAvatar})` }}
                    />
                  </div>
                  <div className={applyMember['serverInfoWrapper']}>
                    <div className={applyMember['serverName']}>
                      {serverName}
                    </div>
                    <div className={applyMember['serverId']}>
                      {`ID: ${serverDisplayId}`}
                    </div>
                  </div>
                </div>
                <div className={Popup['label']}>{'申請須知'}</div>
                <div className={applyMember['noteText']}>
                  {'{server.settings.applicationNote}'}
                </div>
                <div className={applyMember['split']} />
                <div className={applyMember['contentBox']}>
                  <div className={applyMember['notificationText']}>
                    {'申請已送出，請等待管理員審核'}
                  </div>
                </div>
              </div>
            </div>
            <div className={Popup['popupFooter']}>
              <button className={Popup['button']} onClick={() => setSection(0)}>
                {'修改'}
              </button>
              <button className={Popup['button']} onClick={() => handleClose()}>
                {'確認'}
              </button>
            </div>
          </div>
        );
    }
  });

ServerApplicationModal.displayName = 'ServerApplicationModal';

export default ServerApplicationModal;
