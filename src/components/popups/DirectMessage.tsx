/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// Types
import { User, DirectMessage } from '@/types';

// Providers
import { useLanguage } from '@/providers/Language';
import { useSocket } from '@/providers/Socket';

// Components
import MessageViewer from '@/components/viewers/Message';

// Services
import refreshService from '@/services/refresh.service';

// Utils
import { createDefault } from '@/utils/createDefault';

// CSS
import popup from '@/styles/common/popup.module.css';
import directMessage from '@/styles/popups/directMessage.module.css';
import vip from '@/styles/common/vip.module.css';
import grade from '@/styles/common/grade.module.css';

interface DirectMessagePopupProps {
  userId: string;
  targetId: string;
  windowRef: React.RefObject<HTMLDivElement>;
}

const DirectMessagePopup: React.FC<DirectMessagePopupProps> = React.memo(
  (initialData: DirectMessagePopupProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // States
    const [userAvatarUrl, setUserAvatarUrl] = useState<User['avatar']>(
      createDefault.user().avatar,
    );
    const [targetAvatarUrl, setTargetAvatarUrl] = useState<User['avatar']>(
      createDefault.user().avatar,
    );
    const [targetLevel, setTargetLevel] = useState<User['level']>(
      createDefault.user().level,
    );
    const [targetSignature, setTargetSignature] = useState<User['signature']>(
      createDefault.user().signature,
    );
    const [targetVip, setTargetVip] = useState<User['vip']>(
      createDefault.user().vip,
    );

    // Variables
    const { targetId, userId } = initialData;
    const targetGrade = Math.min(56, targetLevel); // 56 is max level

    // Handlers
    const handleSendMessage = (
      directMessage: Partial<DirectMessage>,
      friendId: User['id'],
    ) => {
      if (!socket) return;
      socket.send.directMessage({ directMessage, friendId });
    };

    const handleTargetUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      setTargetAvatarUrl(data.avatarUrl);
      setTargetLevel(data.level);
      setTargetSignature(data.signature);
      setTargetVip(data.vip);
    };

    const handleUserUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      setUserAvatarUrl(data.avatarUrl);
    };

    const shakeWindow = (duration = 500) => {
      const el = initialData.windowRef.current;
      if (!el) return;

      const start = performance.now();

      const shake = (time: number) => {
        const elapsed = time - start;
        if (elapsed > duration) {
          el.style.transform = 'translate(0, 0)';
          return;
        }

        const x = Math.round((Math.random() - 0.5) * 10);
        const y = Math.round((Math.random() - 0.5) * 10);
        el.style.transform = `translate(${x}px, ${y}px)`;

        requestAnimationFrame(shake);
      };
      requestAnimationFrame(shake);
    };

    // Effects
    useEffect(() => {
      if (!userId || !targetId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        Promise.all([
          refreshService.user({
            userId: targetId,
          }),
          refreshService.user({
            userId: userId,
          }),
        ]).then(([target, user]) => {
          handleTargetUpdate(target);
          handleUserUpdate(user);
        });
      };
      refresh();
    }, [userId, targetId]);

    return (
      <div className={popup['popupContainer']}>
        <div className={directMessage['header']}>
          <div className={directMessage['userSignature']}>
            {targetSignature}
          </div>
          <div className={directMessage['directOptionButtons']}>
            <div className={directMessage['fileShare']} />
            <div className={directMessage['blockUser']} />
            <div className={directMessage['unBlockUser']} />
            <div className={directMessage['inviteTempGroup']} />
            <div className={directMessage['report']} />
          </div>
        </div>
        <div className={popup['popupBody']}>
          <div className={directMessage['sidebar']}>
            <div className={directMessage['targetBox']}>
              <div
                className={directMessage['avatarPicture']}
                style={{ backgroundImage: `url(${targetAvatarUrl})` }}
              />
              {targetVip > 0 && (
                <div
                  className={`
                  ${vip['vipIconBig']}
                  ${vip[`vip-big-${targetVip}`]}`}
                />
              )}
              <div
                className={`
                    ${grade['grade']}
                    ${grade[`lv-${targetGrade}`]}`}
              />
            </div>
            <div className={directMessage['userBox']}>
              <div
                className={directMessage['avatarPicture']}
                style={{ backgroundImage: `url(${userAvatarUrl})` }}
              />
            </div>
          </div>
          <div className={directMessage['mainContent']}>
            <div className={directMessage['serverInArea']}>
              <div className={directMessage['serverInIcon']} />
              <div className={directMessage['serverInName']}>測試</div>
            </div>
            <div className={directMessage['messageArea']}>
              <MessageViewer messages={[]} />
            </div>
            <div className={directMessage['inputArea']}>
              <div className={directMessage['topBar']}>
                <div className={directMessage['buttons']}>
                  <div
                    className={`${directMessage['button']} ${directMessage['font']}`}
                  />
                  <div
                    className={`${directMessage['button']} ${directMessage['emoji']}`}
                  />
                  <div
                    className={`${directMessage['button']} ${directMessage['screenShot']}`}
                  />
                  <div
                    className={`${directMessage['button']} ${directMessage['nudge']}`}
                    onClick={() => shakeWindow()}
                  />
                </div>
                <div className={directMessage['buttons']}>
                  <div className={directMessage['historyMessage']}>
                    訊息紀錄
                  </div>
                </div>
              </div>
              <textarea className={directMessage['input']} />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

DirectMessagePopup.displayName = 'DirectMessagePopup';

export default DirectMessagePopup;
