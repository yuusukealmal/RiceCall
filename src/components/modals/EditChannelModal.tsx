import React, { useEffect, useRef, useState } from 'react';

// CSS
import popup from '@/styles/common/popup.module.css';
import setting from '@/styles/popups/editServer.module.css';

// Types
import { Channel, Message, Server } from '@/types';

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
    const [activeTabIndex, setActiveTabIndex] = useState<number>(0);
    const [channelName, setChannelName] = useState<Channel['name']>(
      createDefault.channel().name,
    );
    const [channelUserLimit, setChannelUserLimit] = useState<
      Channel['userLimit']
    >(createDefault.channel().userLimit);
    const [channelIsLobby, setChannelIsLobby] = useState<Channel['isLobby']>(
      createDefault.channel().isLobby,
    );
    const [channelVisibility, setChannelVisibility] = useState<
      Channel['visibility']
    >(createDefault.channel().visibility);
    const [channelTextState, setChannelTextState] = useState<{
      current: Channel['chatMode'];
      original: Channel['chatMode'];
    }>({
      current: 'free',
      original: 'free',
    });
    const [channelVoiceState, setChannelVoiceState] = useState<{
      current: Channel['voiceMode'];
      original: Channel['voiceMode'];
    }>({
      current: 'free',
      original: 'free',
    });

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

    const handleSendMessage = (
      message: Partial<Message>,
      channelId: Channel['id'],
    ): void => {
      if (!socket) return;
      socket.send.message({ message, channelId });
    };

    const handleChannelUpdate = (data: Channel | null) => {
      if (!data) data = createDefault.channel();
      setChannelName(data.name);
      setChannelIsLobby(data.isLobby);
      setChannelVisibility(data.visibility);
      setChannelUserLimit(data.userLimit);
      const chatMode = data.chatMode || 'free';
      setChannelTextState({
        current: chatMode,
        original: chatMode,
      });
      const voiceMode = data.voiceMode || 'free';
      setChannelVoiceState({
        current: voiceMode,
        original: voiceMode,
      });
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    const handleConfirm = () => {
      const validUserLimit = Math.max(0, Math.min(999, channelUserLimit));
      if (validUserLimit !== channelUserLimit)
        setChannelUserLimit(validUserLimit);

      if (channelTextState.current !== channelTextState.original) {
        handleSendMessage(
          {
            type: 'info',
            content:
              channelTextState.current === 'free'
                ? 'TEXT_CHANGE_TO_FREE_SPEECH'
                : 'TEXT_CHANGE_TO_FORBIDDEN_SPEECH',
            timestamp: 0,
          },
          channelId,
        );
      }

      if (channelVoiceState.current !== channelVoiceState.original) {
        handleSendMessage(
          {
            type: 'info',
            content:
              channelVoiceState.current === 'queue'
                ? 'VOICE_CHANGE_TO_QUEUE'
                : channelVoiceState.current === 'forbidden'
                ? 'VOICE_CHANGE_TO_FORBIDDEN_SPEECH'
                : 'VOICE_CHANGE_TO_FREE_SPEECH',
            timestamp: 0,
          },
          channelId,
        );
      }

      handleUpdateChannel(
        {
          name: channelName,
          visibility: channelVisibility,
          userLimit: validUserLimit,
          chatMode: channelTextState.current,
          voiceMode: channelVoiceState.current,
        },
        channelId,
        serverId,
      );
      handleClose();
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
          {/* Left Sidebar */}
          <div className={setting['left']}>
            <div className={setting['tabs']}>
              {[
                '基本資料',
                '頻道公告',
                '訪問許可權',
                '發言許可權',
                '文字許可權',
                '頻道管理',
              ].map((title, index) => (
                <div
                  className={`${setting['item']} ${
                    activeTabIndex === index ? setting['active'] : ''
                  }`}
                  onClick={() => setActiveTabIndex(index)}
                  key={index}
                >
                  {title}
                </div>
              ))}
            </div>
          </div>
          {/* Right Content */}
          <div className={setting['right']}>
            {activeTabIndex === 0 ? (
              <>
                <div className={`${setting['content']} ${popup['row']}`}>
                  <div>
                    <div className={setting['label']}>頻道名稱</div>
                    <input
                      style={{ width: '200px' }}
                      type="text"
                      className={setting['input']}
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className={setting['label']}>人數上限(人)</div>
                    <input
                      style={{ width: '75px' }}
                      type="number"
                      min="0"
                      max="999"
                      className={setting['input']}
                      value={channelUserLimit}
                      disabled={
                        channelVisibility === 'readonly' || channelIsLobby
                      }
                      onChange={(e) => {
                        const value = Math.max(
                          0,
                          Math.min(999, parseInt(e.target.value) || 0),
                        );
                        setChannelUserLimit(value);
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className={setting['label']}>頻道模式</div>
                  <select
                    className={setting['select']}
                    value={channelVisibility}
                    onChange={(e) =>
                      setChannelVisibility(
                        e.target.value as Channel['visibility'],
                      )
                    }
                  >
                    <option value="free">自由發言</option>
                    <option value="admin">管理員發言</option>
                    <option value="queue" disabled>
                      排麥發言
                    </option>
                  </select>
                </div>
                <div className={setting['saperator']}></div>
                <div className={`${setting['section']} ${popup['col']}`}>
                  <div className={setting['label']}>頻道音質</div>
                  <div className={setting['radioGroup']}>
                    <label className={setting['radioLabel']}>
                      <input
                        type="radio"
                        name="voiceQuality"
                        className={setting['radio']}
                        defaultChecked
                        disabled
                      />
                      聊天模式
                    </label>
                    <div className={setting['description']}>
                      低延遲，音質流暢（適用於自由、指揮模式下的頻道語音）
                    </div>
                  </div>
                  <div className={setting['radioGroup']}>
                    <label className={setting['radioLabel']}>
                      <input
                        type="radio"
                        name="voiceQuality"
                        className={setting['radio']}
                        disabled
                      />
                      娛樂模式
                    </label>
                    <div className={setting['description']}>
                      原汁原味，立體聲效（適用於排麥模式下的頻道、K歌等型活動語音）
                    </div>
                  </div>
                </div>
              </>
            ) : activeTabIndex === 1 ? (
              <div className={popup['col']}>
                <div className={popup['label']}>
                  {lang.tr.inputAnnouncement}
                </div>
                <div className={`${popup['inputBox']} ${popup['col']}`}>
                  <textarea
                    disabled
                    style={{ minHeight: '200px' }}
                    // value={channelAnnouncement}
                    value={''}
                    // onChange={(e) => setChannelAnnouncement(e.target.value)}
                    onChange={() => {}}
                  />
                  <div className={popup['label']}>
                    {lang.tr.markdownSupport}
                  </div>
                </div>
              </div>
            ) : activeTabIndex === 2 ? (
              <div className={popup['col']}>
                <label>訪問許可權</label>
                <div className={setting['radioGroup']}>
                  <label className={setting['radioLabel']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      className={setting['radio']}
                      checked={channelVisibility === 'public'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('public');
                      }}
                    />
                    公開
                  </label>
                  <div className={setting['description']}>
                    {lang.tr.channelPublic}
                  </div>
                </div>
                <div className={setting['radioGroup']}>
                  <label className={setting['radioLabel']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      className={setting['radio']}
                      checked={channelVisibility === 'member'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('member');
                      }}
                    />
                    會員
                  </label>
                  <div className={setting['description']}>
                    {lang.tr.channelMember}
                  </div>
                </div>
                <div className={setting['radioGroup']}>
                  <label className={setting['radioLabel']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      className={setting['radio']}
                      checked={channelVisibility === 'private'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('private');
                      }}
                    />
                    鎖定
                  </label>
                  <div className={setting['description']}>
                    {lang.tr.channelPrivate}
                  </div>
                </div>
                <div className={setting['radioGroup']}>
                  <label className={setting['radioLabel']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      className={setting['radio']}
                      checked={channelVisibility === 'readonly'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('readonly');
                      }}
                    />
                    {lang.tr.channelReadonly}
                  </label>
                  <div className={setting['description']}>任何人皆不可訪問</div>
                </div>
              </div>
            ) : activeTabIndex === 3 ? (
              <div className={popup['col']}>
                <label>發言許可權</label>
                <div className={setting['checkWrapper']}>
                  <label
                    className={`${setting['checkBox']} ${popup['disabled']}`}
                  >
                    <input
                      type="checkbox"
                      className={setting['check']}
                      checked={false}
                      onChange={() => {}}
                    />
                    <span>禁止遊客排麥發言</span>
                  </label>
                </div>
                <div className={setting['checkWrapper']}>
                  <label
                    className={`${setting['checkBox']} ${popup['disabled']}`}
                  >
                    <input
                      type="checkbox"
                      className={setting['check']}
                      checked={false}
                      onChange={() => {}}
                    />
                    <span>自由發言模式禁止遊客語音</span>
                  </label>
                </div>
              </div>
            ) : activeTabIndex === 4 ? (
              <div className={popup['col']}>
                <label>文字許可權</label>
                <div className={setting['checkWrapper']}>
                  <label className={setting['checkBox']}>
                    <input
                      type="checkbox"
                      className={setting['check']}
                      checked={channelTextState.current === 'forbidden'}
                      onChange={(e) => {
                        const newMode = e.target.checked ? 'forbidden' : 'free';
                        setChannelTextState((prev) => ({
                          ...prev,
                          current: newMode,
                        }));
                      }}
                    />
                    <span>此頻道被設定為只允許管理員發送文字訊息</span>
                  </label>
                </div>
                <div className={setting['checkWrapper']}>
                  <label
                    className={`${setting['checkBox']} ${popup['disabled']}`}
                  >
                    <input
                      type="checkbox"
                      className={setting['check']}
                      checked={false}
                      onChange={() => {}}
                    />
                    <span>此頻道被設定為遊客禁止發送文字訊息</span>
                  </label>
                </div>
                <div className={setting['checkWrapper']}>
                  <label
                    className={`${setting['checkBox']} ${popup['disabled']}`}
                  >
                    <input
                      type="checkbox"
                      className={setting['check']}
                      checked={false}
                      onChange={() => {}}
                    />
                    <span>禁止訪客發送包含URL的文字訊息</span>
                  </label>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    遊客發送文字訊息的最大長度:
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>字元</span>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    遊客允許發送文字訊息的等待時間:
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>秒</span>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    遊客每次發送文字訊息的相隔時間:
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>秒</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={popup['popupFooter']}>
          <button className={popup['button']} onClick={handleConfirm}>
            {lang.tr.confirm}
          </button>
          <button
            type="button"
            className={popup['button']}
            onClick={() => handleClose()}
          >
            {lang.tr.cancel}
          </button>
        </div>
      </div>
    );
  },
);

EditChannelModal.displayName = 'EditChannelModal';

export default EditChannelModal;
