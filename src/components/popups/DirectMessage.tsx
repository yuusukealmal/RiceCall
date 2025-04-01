/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';

// Types
import { User, DirectMessage } from '@/types';

// Providers
import { useLanguage } from '@/providers/Language';
import { useSocket } from '@/providers/Socket';

// Components
import MessageViewer from '@/components/viewers/Message';
import MessageInputBox from '@/components/MessageInputBox';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';

// Utils
import { createDefault } from '@/utils/createDefault';

// CSS
import popup from '@/styles/common/popup.module.css';
import directMessage from '@/styles/popups/directMessage.module.css';
import vipLevel from '@/styles/common/vip.module.css';
import userLevel from '@/styles/common/grade.module.css';
import { dir } from 'console';

interface DirectMessageModalProps {
  friendId: string;
  userId: string;
}

const DirectMessageModal: React.FC<DirectMessageModalProps> = React.memo(
  (initialData: DirectMessageModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // States
    const [friendAvatar, setFriendAvatar] = useState<User['avatar']>(
      createDefault.user().avatar,
    );
    const [friendName, setFriendName] = useState<User['name']>(
      createDefault.user().name,
    );
    const [friendLevel, setFriendLevel] = useState<User['level']>(
      createDefault.user().level,
    );

    // Variables
    const { friendId, userId } = initialData;
    const friendGrade = Math.min(56, friendLevel); // 56 is max level

    // Handlers
    const handleSendMessage = (
      directMessage: Partial<DirectMessage>,
      friendId: User['id'],
    ) => {
      if (!socket) return;
      socket.send.directMessage({ directMessage, friendId });
    };

    const handleFriendUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      setFriendAvatar(data.avatar);
      setFriendName(data.name);
      setFriendLevel(data.level);
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    // Effects
    useEffect(() => {
      if (!userId || !friendId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        Promise.all([
          refreshService.user({
            userId: friendId,
          }),
        ]).then(([friend]) => {
          handleFriendUpdate(friend);
        });
      };
      refresh();
    }, [userId, friendId]);

    const handleNudgeEvent = () => {};

    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.createElement('button');
      btn.onclick = () => shakeWindow('chatWindow');
      document.body.appendChild(btn);
    });
    function shakeWindow(targetId: unknown, duration = 500) {
      const windowEl = document.getElementById(targetId);
      if (!windowEl) return;

      const start = Date.now();
      const shake = () => {
        const elapsed = Date.now() - start;
        if (elapsed > duration) {
          windowEl.style.transform = 'translate(0, 0)';
          return;
        }

        const x = (Math.random() - 0.5) * 30; // 範圍 -5~5px
        const y = (Math.random() - 0.5) * 30;
        windowEl.style.transform = `translate(${x}px, ${y}px)`;

        requestAnimationFrame(shake);
      };

      shake();
    }

    return (
      <>
        <div className={directMessage['directBox']}>
          <div className={directMessage['headerWrapper']}>
            <div className={directMessage['headerBox']}>
              <div className={directMessage['header']}>
                <div className={directMessage['targetUserInfo']}>
                  <span className={directMessage['targetUserName']}>123</span>
                  <span className={directMessage['targetUserDescription']}>
                    test message 123123121312323132
                  </span>
                </div>
              </div>
              <div className={directMessage['actionButtons']}>
                <div
                  className={`${directMessage['actionButton']} ${directMessage['minimizeButton']}`}
                ></div>
                <div
                  className={`${directMessage['actionButton']} ${directMessage['maxsizeButton']}`}
                ></div>
                <div
                  className={`${directMessage['actionButton']} ${directMessage['closeButton']}`}
                ></div>
              </div>
            </div>
            <div className={directMessage['directOptionButtons']}>
              <div
                className={directMessage['directOptionFileShareButton']}
              ></div>
              <div
                className={directMessage['directOptionBlockUserButton']}
              ></div>
              <div
                className={directMessage['directOptionInviteTempGroupButton']}
              ></div>
              <div className={directMessage['directOptionReportButton']}></div>
            </div>
          </div>
          <div className={directMessage['bodyWrapper']}>
            <div className={directMessage['bodyBox']}>
              <div className={directMessage['disrectLeftItems']}>
                <div className={directMessage['disrectLeftTargetBox']}>
                  <div
                    className={directMessage['disrectLeftTargetAvatarBorder']}
                  >
                    <div
                      className={directMessage['disrectLeftTargetAvatarImage']}
                    ></div>
                  </div>
                  <div
                    className={`${vipLevel['vip-big-1']} ${directMessage['disrectTargetVIP']}`}
                  ></div>
                  <div
                    className={`${userLevel['grade']} ${userLevel['lv-2']} ${directMessage['disrectTargetLevel']}`}
                  ></div>
                </div>
                <div className={directMessage['disrectLeftSelfAvatarBorder']}>
                  <div
                    className={directMessage['disrectLeftSelfAvatarImage']}
                  ></div>
                </div>
              </div>
              <div className={directMessage['disrectRightItems']}>
                <div className={directMessage['serverInBox']}>
                  <div className={directMessage['serverInIcon']}></div>
                  <div className={directMessage['serverInName']}>測試</div>
                </div>
                <div className={directMessage['serverSplit']}></div>
                <div className={directMessage['chatTextArea']}>
                  {/** 訊息內容 **/}
                  <div className={directMessage['chatMessageBox']}>
                    <div className={directMessage['chatMessageUsernameBox']}>
                      <div className={directMessage['chatMessageUsername']}>
                        你好名字
                      </div>
                      <div className={directMessage['chatMessageTime']}>
                        17:15:17
                      </div>
                    </div>
                    <div className={directMessage['chatMessageText']}>123</div>
                  </div>
                </div>
                <div className={directMessage['chatInputBox']}>
                  <div className={directMessage['chatInputTopBar']}>
                    <div className={directMessage['chatInputTopBarLeft']}>
                      <div
                        className={`${directMessage['button']} ${directMessage['chatInputTopBarFont']}`}
                      ></div>
                      <div
                        className={`${directMessage['button']} ${directMessage['chatInputTopBarEmoji']}`}
                      ></div>
                      <div
                        className={`${directMessage['button']} ${directMessage['chatInputTopBarScreenShot']}`}
                      ></div>
                      <div
                        className={`${directMessage['button']} ${directMessage['chatInputTopBarNudge']}`}
                      ></div>
                    </div>
                    <div
                      className={directMessage['chatInputTopBarHistoryMessage']}
                    >
                      訊息紀錄
                    </div>
                  </div>
                  <div className={directMessage['chatInputTopBarInputArea']}>
                    <textarea
                      className={directMessage['chatInputTopBarTextarea']}
                    ></textarea>
                    <div
                      className={
                        directMessage['chatInputTopBarInputEnterButton']
                      }
                    ></div>
                  </div>
                </div>
                <div className={directMessage['adSlogenArea']}>
                  <div className={directMessage['adSlogenAreaText']}>
                    這個遊戲我已經通霄玩了1分鐘，我先出殯了，推薦給你！
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
    // <Modal title={friendName} onClose={onClose} width="600px" height="600px">
    //   <div className="flex h-full">
    //     {/* Side Menu */}
    //     <div className="flex flex-col p-4 w-40 bg-blue-50 text-sm">
    //       {/* <img src={friendAvatar} className="w-24 h-24" /> */}
    //       <div className="flex items-center gap-2">
    //         <div className="">{`${lang.tr.level}: ${friendLevel}`}</div>
    //         {/* <img src={friendGradeUrl} className="select-none" /> */}
    //       </div>
    //     </div>
    //     {/* Main Content */}
    //     <div className="flex flex-col flex-1 overflow-y-auto">
    //       {/* Messages Area */}
    //       <div className="flex flex-[5] p-3">
    //         <MessageViewer messages={friendDirectMessages} />
    //       </div>
    //       {/* Input Area */}
    //       <div className="flex flex-[1] p-3">
    //         <MessageInputBox
    //           onSendMessage={(msg) => {
    //             handleSendMessage({
    //               id: '',
    //               type: 'general',
    //               content: msg,
    //               senderId: userId,
    //               friendId: friendId,
    //               timestamp: 0,
    //             });
    //           }}
    //         />
    //       </div>
    //     </div>
    //   </div>
    // </Modal>
  },
);

DirectMessageModal.displayName = 'DirectMessageModal';

export default DirectMessageModal;
