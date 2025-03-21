import React, { useEffect, useRef, useState } from 'react';
import defaultAvatar from '../../../public/logo_server_def.png';

// CSS
import popup from '@/styles/common/popup.module.css';
import createServer from '@/styles/popups/createServer.module.css';

// Types
import { User, Server, PopupType } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';
import { apiService, API_URL } from '@/services/api.service';

// Utils
import { createDefault } from '@/utils/default';

interface CreateServerModalProps {
  userId: string;
}

const CreateServerModal: React.FC<CreateServerModalProps> = React.memo(
  (initialData: CreateServerModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshRef = useRef(false);

    // Constant
    const MAX_GROUPS = 999;
    const SERVER_TYPES: { value: Server['type']; name: string }[] = [
      {
        value: 'game',
        name: lang.tr.game,
      },
      {
        value: 'entertainment',
        name: lang.tr.entertainment,
      },
      {
        value: 'other',
        name: lang.tr.other,
      },
    ];

    // States
    const [userOwnedServers, setUserOwnedServers] = useState<Server[]>([]);
    const [serverName, setServerName] = useState<Server['name']>('');
    const [serverType, setServerType] = useState<Server['type']>('game');
    const [serverAvatar, setServerAvatar] = useState<Server['avatar']>('');
    const [serverDescription, setServerDescription] =
      useState<Server['description']>('');
    const [section, setSection] = useState<number>(0);

    // Variables
    const { userId } = initialData;
    const remainingGroups = MAX_GROUPS - userOwnedServers.length;
    const canCreate = remainingGroups > 0;

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleCreateServer = async (server: Partial<Server>) => {
      if (!socket) return;

      if (serverAvatar) {
        const formData = new FormData();
        formData.append('_type', 'server');
        formData.append('_userId', userId);
        formData.append('_avatar', serverAvatar);

        try {
          const response = await fetch(`${API_URL}/upload/avatar`, {
            method: 'POST',
            body: formData,
          });
          const result = await response.json();
          if (response.ok) {
            server.avatar = result.fileName;
          } else {
            handleOpenErrorDialog('Server avatar upload failed');
            return;
          }
        } catch (error) {
          handleOpenErrorDialog('Server avatar upload failed');
          return;
        }
      }

      socket.send.createServer({ server: server, userId: userId });
    };

    const handleOpenErrorDialog = (message: string) => {
      ipcService.popup.open(PopupType.DIALOG_ERROR);
      ipcService.initialData.onRequest(PopupType.DIALOG_ERROR, {
        title: message,
        submitTo: PopupType.DIALOG_ERROR,
      });
    };

    const handleUserUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      setUserOwnedServers(data.ownedServers || []);
    };

    // Effects
    useEffect(() => {
      if (!userId) return;
      if (refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        const user = await apiService.post('/refresh/user', {
          userId: userId,
        });
        handleUserUpdate(user);
      };
      refresh();
    }, [userId]);

    useEffect(() => {
      fetch(defaultAvatar.src)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setServerAvatar(reader.result as string);
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => console.error('預設圖片讀取失敗:', err));
    }, []);

    switch (section) {
      // Server Type Selection Section
      case 0:
        return (
          <div className={popup['popupContainer']}>
            <div className={popup['popupBody']}>
              <div className={createServer['tab']}>
                <div
                  className={`${createServer['item']} ${createServer['active']}`}
                >
                  {lang.tr.selectGroupType}
                </div>
                <div className={`${createServer['item']}`}>
                  {lang.tr.fillInfo}
                </div>
              </div>
              <div className={createServer['body']}>
                <div className={`${createServer['message']}`}>
                  {`${lang.tr.remainingGroup1}${remainingGroups}${lang.tr.remainingGroup2}`}
                </div>
                <label className={createServer['typeLabel']} data-key="60030">
                  {lang.tr.selectGroupTypeDescription}
                </label>
                <div className={createServer['buttonGroup']}>
                  {SERVER_TYPES.map((type) => (
                    <div
                      key={type.value}
                      className={`${createServer['button']} ${
                        serverType === type.value
                          ? createServer['selected']
                          : ''
                      }`}
                      onClick={() =>
                        setServerType(type.value as Server['type'])
                      }
                    >
                      {type.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className={popup['popupFooter']}>
              <button
                className={`${popup['button']} ${
                  !serverType || !canCreate ? popup['disabled'] : ''
                }`}
                disabled={!serverType || !canCreate}
                onClick={() => setSection(1)}
              >
                {lang.tr.next}
              </button>
              <button className={popup['button']} onClick={() => handleClose()}>
                {lang.tr.cancel}
              </button>
            </div>
          </div>
        );

      // Server Data Input Section
      case 1:
        return (
          <div className={popup['popupContainer']}>
            <div className={popup['popupBody']}>
              <div className={createServer['tab']}>
                <div className={`${createServer['item']}`}>
                  {lang.tr.selectGroupType}
                </div>
                <div
                  className={`${createServer['item']} ${createServer['active']}`}
                >
                  {lang.tr.fillInfo}
                </div>
              </div>
              <div className={createServer['body']}>
                <div className={createServer['avatarWrapper']}>
                  <div
                    className={createServer['avatarPicture']}
                    style={{ backgroundImage: `url(${serverAvatar})` }}
                  />
                  <input
                    type="file"
                    id="avatar-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        handleOpenErrorDialog(lang.tr.canNotReadImage);
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        handleOpenErrorDialog(lang.tr.imageTooLarge);
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () =>
                        setServerAvatar(reader.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label
                    htmlFor="avatar-upload"
                    style={{ marginTop: '10px' }}
                    className={popup['button']}
                  >
                    {lang.tr.uploadAvatar}
                  </label>
                </div>
                <div className={createServer['inputGroup']}>
                  <div className={popup['inputBox']}>
                    <div className={popup['label']}>{lang.tr.groupType}</div>
                    <input
                      className={popup['input']}
                      type="text"
                      disabled
                      value={lang.tr[serverType as keyof typeof lang.tr]}
                    />
                  </div>
                  <div className={popup['inputBox']}>
                    <div className={`${popup['label']} ${popup['required']}`}>
                      {lang.tr.groupName}
                    </div>
                    <input
                      className={popup['input']}
                      type="text"
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      // onBlur={() =>
                      //   setErrors((prev) => ({
                      //     ...prev,
                      //     name: validateName(serverName),
                      //   }))}
                      placeholder={lang.tr.groupNamePlaceholder}
                    />
                    {/* {errors.name && <p className="text-red-500">{errors.name}</p>} */}
                  </div>
                  <div className={popup['inputBox']}>
                    <div className={popup['label']}>{lang.tr.groupSlogan}</div>
                    <textarea
                      className={popup['input']}
                      value={serverDescription}
                      onChange={(e) => setServerDescription(e.target.value)}
                      // onBlur={() =>
                      //   setErrors((prev) => ({
                      //     ...prev,
                      //     description: validateDescription(serverDescription),
                      //   }))}
                      placeholder={lang.tr.groupSloganPlaceholder}
                    />
                    {/* {errors.description && (
                  <p className="text-red-500">{errors.description}</p>
                )} */}
                  </div>
                </div>
              </div>
            </div>
            <div className={popup['popupFooter']}>
              <button className={popup['button']} onClick={() => setSection(0)}>
                {lang.tr.previous}
              </button>
              <button
                className={`${popup['button']} ${
                  !serverName.trim() || !canCreate ? popup['disabled'] : ''
                }`}
                disabled={!serverName.trim() || !canCreate}
                onClick={async () => {
                  await handleCreateServer({
                    name: serverName,
                    // avatar: serverAvatar,
                    description: serverDescription,
                    type: serverType,
                    ownerId: userId,
                  });
                  handleClose();
                }}
              >
                {lang.tr.confirm}
              </button>
            </div>
          </div>
        );
    }
  },
);

CreateServerModal.displayName = 'CreateServerModal';

export default CreateServerModal;
