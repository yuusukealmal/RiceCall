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
import ipcService from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/createDefault';
import refreshService from '@/services/refresh.service';

interface ApplyMemberPopupProps {
  serverId: string;
  userId: string;
}

const ApplyMemberPopup: React.FC<ApplyMemberPopupProps> = React.memo(
  (initialData: ApplyMemberPopupProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // State
    const [serverName, setServerName] = useState<Server['name']>(
      createDefault.server().name,
    );
    const [serverAvatarUrl, setServerAvatarUrl] = useState<Server['avatarUrl']>(
      createDefault.server().avatarUrl,
    );
    const [serverDisplayId, setServerDisplayId] = useState<Server['displayId']>(
      createDefault.server().displayId,
    );
    const [applicationDescription, setApplicationDescription] = useState<
      MemberApplication['description']
    >(createDefault.memberApplication().description);

    // Variables
    const { userId, serverId } = initialData;

    // Section Control
    const [section, setSection] = useState<number>(0);

    const handleCreatMemberApplication = (
      application: Partial<MemberApplication>,
    ) => {
      if (!socket) return;
      socket.send.createMemberApplication({
        memberApplication: application,
        userId: userId,
      });
    };

    const handleServerUpdate = (data: Server | null) => {
      if (!data) data = createDefault.server();
      setServerName(data.name);
      setServerDisplayId(data.displayId);
      setServerAvatarUrl(data.avatarUrl);
    };

    const handleMemberApplicationUpdate = (data: MemberApplication | null) => {
      setSection(data ? 1 : 0);
      if (!data) data = createDefault.memberApplication();
      setApplicationDescription(data.description);
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

    // UseEffect
    useEffect(() => {
      if (!serverId || !userId || refreshRef.current) return;
      const refresh = async () => {
        const server = await refreshService.server({ serverId: serverId });
        handleServerUpdate(server);
        const memberApplication = await refreshService.memberApplication({
          userId: userId,
          serverId: serverId,
        });
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
            <div className={Popup['popupBody']}>
              <div className={applyMember['body']}>
                <div className={applyMember['headerBox']}>
                  <div className={applyMember['avatarWrapper']}>
                    <div
                      className={applyMember['avatarPicture']}
                      style={{ backgroundImage: `url(${serverAvatarUrl})` }}
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
                      style={{ backgroundImage: `url(${serverAvatarUrl})` }}
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
  },
);

ApplyMemberPopup.displayName = 'ApplyMemberPopup';

export default ApplyMemberPopup;
