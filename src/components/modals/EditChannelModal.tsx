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
    const [channelTextState, setChannelTextState] = useState<
      Channel['chatMode']
    >(createDefault.channel().chatMode);
    const [channelVoiceState, setChannelVoiceState] = useState<
      Channel['voiceMode']
    >(createDefault.channel().voiceMode);

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
      setChannelTextState(data.chatMode);
      setChannelVoiceState(data.voiceMode);
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
                <div className={popup['col']}>
                  <div className={popup['row']}>
                    <div className={`${popup['inputBox']} ${popup['col']}`}>
                      <div className={popup['label']}>
                        {lang.tr.channelNameLabel}
                      </div>
                      <input
                        type="text"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                      />
                    </div>
                    <div className={`${popup['inputBox']} ${popup['col']}`}>
                      <div className={popup['label']}>{lang.tr.userLimit}</div>
                      <input
                        type="text"
                        value={channelUserLimit}
                        disabled={
                          channelVisibility === 'readonly' || channelIsLobby
                        }
                        onChange={(e) =>
                          setChannelUserLimit(
                            Math.max(
                              0,
                              Math.min(999, parseInt(e.target.value) || 0),
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                  <div className={`${popup['inputBox']} ${popup['col']}`}>
                    <div className={popup['label']}>{lang.tr.channelMode}</div>
                    <select
                      value={channelVisibility}
                      onChange={(e) =>
                        setChannelVisibility(
                          e.target.value as Channel['visibility'],
                        )
                      }
                    >
                      <option value="free">{lang.tr.freeSpeech}</option>
                      <option value="admin">{lang.tr.forbiddenSpeech}</option>
                      <option value="queue" disabled>
                        {lang.tr.queueSpeech}
                      </option>
                    </select>
                  </div>
                </div>
                <div className={setting['saperator']} />
                <div className={popup['col']}>
                  <div className={popup['label']}>
                    {lang.tr.channelAudioQuality}
                  </div>
                  <div className={popup['inputGroup']}>
                    <div className={`${popup['inputBox']} ${popup['row']}`}>
                      <input
                        type="radio"
                        name="voiceQuality"
                        defaultChecked
                        disabled
                      />
                      <div>
                        <label className={popup['label']}>
                          {lang.tr.chatMode}
                        </label>
                        <div className={popup['hint']}>
                          {lang.tr.chatModeDescription}
                        </div>
                      </div>
                    </div>

                    <div className={`${popup['inputBox']} ${popup['row']}`}>
                      <input type="radio" name="voiceQuality" disabled />
                      <div>
                        <label className={popup['label']}>
                          {lang.tr.entertainmentMode}
                        </label>
                        <div className={popup['hint']}>
                          {lang.tr.entertainmentModeDescription}
                        </div>
                      </div>
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
                <div className={popup['inputGroup']}>
                  <div className={popup['inputBox']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      checked={channelVisibility === 'public'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('public');
                      }}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.channelPublic}
                      </label>
                    </div>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      checked={channelVisibility === 'member'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('member');
                      }}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.channelMember}
                      </label>
                    </div>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      checked={channelVisibility === 'private'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('private');
                      }}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.channelPrivate}
                      </label>
                    </div>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="radio"
                      name="voiceQuality"
                      checked={channelVisibility === 'readonly'}
                      disabled={channelIsLobby}
                      onChange={() => {
                        setChannelVisibility('readonly');
                      }}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.channelReadonly}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTabIndex === 3 ? (
              <div className={popup['col']}>
                <label>{lang.tr.speakingPermissions}</label>
                <div className={popup['inputGroup']}>
                  <div className={popup['inputBox']}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      onChange={() => {}}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.forbidGuestQueue}
                      </label>
                    </div>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled
                      onChange={() => {}}
                    />
                    <div>
                      <label className={popup['label']}>
                        {lang.tr.forbidGuestVoice}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTabIndex === 4 ? (
              <div className={popup['col']}>
                <label>{lang.tr.textPermissions}</label>
                <div className={popup['inputGroup']}>
                  <div className={popup['inputBox']}>
                    <input
                      type="checkbox"
                      checked={channelTextState === 'forbidden'}
                      disabled={true}
                      onChange={(e) => {
                        const newMode = e.target.checked ? 'forbidden' : 'free';
                        setChannelTextState(newMode);
                        handleSendMessage(
                          {
                            type: 'info',
                            content: e.target.checked
                              ? 'TEXT_CHANGE_TO_FORBIDDEN_SPEECH'
                              : 'TEXT_CHANGE_TO_FREE_SPEECH',
                            timestamp: 0,
                          },
                          channelId,
                        );
                      }}
                    />
                    <label className={popup['label']}>
                      {lang.tr.forbidGuestText}
                    </label>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={true}
                      onChange={() => {}}
                    />
                    <label className={popup['label']}>
                      {lang.tr.forbidGuestText}
                    </label>
                  </div>

                  <div className={popup['inputBox']}>
                    <input
                      type="checkbox"
                      checked={false}
                      disabled={true}
                      onChange={() => {}}
                    />
                    <label className={popup['label']}>
                      {lang.tr.forbidGuestUrl}
                    </label>
                  </div>

                  <div className={`${popup['inputBox']} ${popup['row']}`}>
                    <div className={popup['label']}>
                      {lang.tr.guestTextMaxLength}
                    </div>
                    <input
                      type="text"
                      value={0}
                      disabled
                      onChange={() => {}}
                      style={{ width: '60px' }}
                    />
                    <div className={popup['label']}>{lang.tr.characters}</div>
                  </div>

                  <div className={`${popup['inputBox']} ${popup['row']}`}>
                    <div className={popup['label']}>
                      {lang.tr.guestTextWaitTime}
                    </div>
                    <input
                      type="text"
                      value={0}
                      disabled
                      onChange={() => {}}
                      style={{ width: '60px' }}
                    />
                    <div className={popup['label']}>{lang.tr.seconds}</div>
                  </div>

                  <div className={`${popup['inputBox']} ${popup['row']}`}>
                    <div className={popup['label']}>
                      {lang.tr.guestTextInterval}
                    </div>
                    <input
                      type="text"
                      value={0}
                      disabled
                      onChange={() => {}}
                      style={{ width: '60px' }}
                    />
                    <div className={popup['label']}>{lang.tr.seconds}</div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={popup['popupFooter']}>
          <button
            className={popup['button']}
            onClick={() => {
              handleUpdateChannel(
                {
                  name: channelName,
                  visibility: channelVisibility,
                  userLimit: channelUserLimit,
                  chatMode: channelTextState,
                  voiceMode: channelVoiceState,
                },
                channelId,
                serverId,
              );
              handleClose();
            }}
          >
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
