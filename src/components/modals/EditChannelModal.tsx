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
                lang.tr.basicInfo,
                lang.tr.channelAnnouncement,
                lang.tr.accessPermissions,
                lang.tr.speakingPermissions,
                lang.tr.textPermissions,
                lang.tr.channelManagement,
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
                    <div className={popup['label']}>
                      {lang.tr.channelNameLabel}
                    </div>
                    <input
                      style={{ width: '200px' }}
                      type="text"
                      className={setting['input']}
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className={popup['label']}>{lang.tr.userLimit}</div>
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
                  <div className={popup['label']}>{lang.tr.channelMode}</div>
                  <select
                    className={setting['select']}
                    value={channelVoiceState.current}
                    onChange={(e) =>
                      setChannelVoiceState((prev) => ({
                        ...prev,
                        current: e.target.value as Channel['voiceMode'],
                      }))
                    }
                  >
                    <option value="free">{lang.tr.freeSpeech}</option>
                    <option value="forbidden">{lang.tr.forbiddenSpeech}</option>
                    <option value="queue">{lang.tr.queueSpeech}</option>
                  </select>
                </div>
                <div className={setting['saperator']}></div>
                <div className={`${setting['section']} ${popup['col']}`}>
                  <div className={popup['label']}>
                    {lang.tr.channelAudioQuality}
                  </div>
                  <div className={setting['radioGroup']}>
                    <label className={setting['radioLabel']}>
                      <input
                        type="radio"
                        name="voiceQuality"
                        className={setting['radio']}
                        defaultChecked
                        disabled
                      />
                      <span>{lang.tr.chatMode}</span>
                    </label>
                    <div className={setting['description']}>
                      <span>{lang.tr.chatModeDescription}</span>
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
                      <span>{lang.tr.entertainmentMode}</span>
                    </label>
                    <div className={setting['description']}>
                      <span>{lang.tr.entertainmentModeDescription}</span>
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
                <label>{lang.tr.accessPermissions}</label>
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
                    <span>{lang.tr.channelPublic}</span>
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
                    <span>{lang.tr.channelMember}</span>
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
                    <span>{lang.tr.channelPrivate}</span>
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
                    <span>{lang.tr.channelReadonly}</span>
                  </label>
                  <div className={setting['description']}>
                    {lang.tr.channelReadonly}
                  </div>
                </div>
              </div>
            ) : activeTabIndex === 3 ? (
              <div className={popup['col']}>
                <label>{lang.tr.speakingPermissions}</label>
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
                    <span>{lang.tr.forbidGuestQueue}</span>
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
                    <span>{lang.tr.forbidGuestVoice}</span>
                  </label>
                </div>
              </div>
            ) : activeTabIndex === 4 ? (
              <div className={popup['col']}>
                <label>{lang.tr.textPermissions}</label>
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
                    <span>{lang.tr.forbidGuestText}</span>
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
                    <span>{lang.tr.forbidGuestUrl}</span>
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
                    <span>{lang.tr.forbidGuestText}</span>
                  </label>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    {lang.tr.guestTextMaxLength}
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>{lang.tr.characters}</span>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    {lang.tr.guestTextWaitTime}
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>{lang.tr.seconds}</span>
                </div>
                <div
                  className={`${setting['unitWrapper']} ${popup['disabled']}`}
                >
                  <div className={setting['unitLabel']}>
                    {lang.tr.guestTextInterval}
                  </div>
                  <input
                    type="number"
                    className={setting['input']}
                    style={{ width: '60px' }}
                    value={0}
                    onChange={(e) => {}}
                  />
                  <span className={setting['unit']}>{lang.tr.seconds}</span>
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
