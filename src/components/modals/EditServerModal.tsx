/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// CSS
import EditServer from '@/styles/popups/editServer.module.css';
import Popup from '@/styles/common/popup.module.css';
import permission from '@/styles/common/permission.module.css';

// Components
import MarkdownViewer from '@/components/viewers/MarkdownViewer';

// Types
import {
  MemberApplication,
  Server,
  PopupType,
  ServerMember,
  SocketServerEvent,
  User,
  Member,
  Channel,
  Permission,
} from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useContextMenu } from '@/providers/ContextMenuProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';

// Utils
import { createDefault } from '@/utils/default';
import { createSorter } from '@/utils/sort';

interface ServerSettingModalProps {
  serverId: string;
  userId: string;
}

const EditServerModal: React.FC<ServerSettingModalProps> = React.memo(
  (initialData: ServerSettingModalProps) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();
    const contextMenu = useContextMenu();

    // Constants
    const MEMBER_FIELDS = [
      {
        name: `名字`,
        field: 'name',
      },
      {
        name: `權限`,
        field: 'permissionLevel',
      },
      {
        name: `貢獻`,
        field: 'contribution',
      },
      {
        name: `加入時間`,
        field: 'createdAt',
      },
    ];
    const APPLICATION_FIELDS = [
      {
        name: `名字`,
        field: 'name',
      },
      {
        name: `描述`,
        field: 'description',
      },
    ];
    const BLOCK_MEMBER_FIELDS = [
      {
        name: `名字`,
        field: 'name',
      },
    ];

    // Refs
    const refreshRef = useRef(false);

    // States
    const [user, setUser] = useState<User>(createDefault.user());
    const [server, setServer] = useState<Server>(createDefault.server());

    const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

    const setServerIcon = useRef<HTMLInputElement>(null);

    const [sortState, setSortState] = useState<1 | -1>(-1);
    const [sortField, setSortField] = useState<string>('');

    // Variables
    const { serverId, userId } = initialData;
    const {
      name: serverName,
      avatar: serverAvatar,
      announcement: serverAnnouncement,
      description: serverDescription,
      type: serverType,
      displayId: serverDisplayId,
      slogan: serverSlogan,
      level: serverLevel,
      wealth: serverWealth,
      createdAt: serverCreatedAt,
      visibility: serverVisibility,
      members: serverMembers = [],
      memberApplications: serverApplications = [],
    } = server;
    const serverBlockMembers = serverMembers.filter((mb) => mb.isBlocked);

    // Handlers
    const handleSort = <T extends ServerMember | MemberApplication>(
      field: keyof T,
      array: T[],
    ) => {
      const newDirection =
        sortField === String(field) ? (sortState === 1 ? -1 : 1) : -1;
      setSortField(String(field));
      setSortState(newDirection);
      return [...array].sort(createSorter(field, newDirection));
    };

    const handleBlockMemberSort = (field: keyof ServerMember) => {
      const sortedMembers = handleSort(field, [...serverBlockMembers]);
      setServer((prev) => ({
        ...prev,
        blockMembers: sortedMembers,
      }));
    };

    const handleMemberSort = (field: keyof ServerMember) => {
      const sortedMembers = handleSort(field, [...serverMembers]);
      setServer((prev) => ({
        ...prev,
        members: sortedMembers,
      }));
    };

    const handleApplicationSort = (field: keyof MemberApplication) => {
      const sortedApplications = handleSort(field, [...serverApplications]);
      setServer((prev) => ({
        ...prev,
        memberApplications: sortedApplications,
      }));
    };

    const handleOpenErrorDialog = (message: string) => {
      ipcService.popup.open(PopupType.DIALOG_ERROR);
      ipcService.initialData.onRequest(PopupType.DIALOG_ERROR, {
        title: message,
        submitTo: PopupType.DIALOG_ERROR,
      });
    };

    const handleClose = () => {
      ipcService.window.close();
    };

    const handleUpdateServer = () => {
      if (!socket) return;
      socket.send.updateServer({ server: server, userId: userId });
      handleClose();
    };

    const handleApplicationAction = (action: 'accept' | 'reject') => {};

    const handleUserMove = () => {};

    const handleKickServer = () => {};

    const handleBlockUser = () => {};

    const handleServerUpdate = (data: Partial<Server> | null) => {
      if (!data) data = createDefault.server();
      setServer((prev) => ({ ...prev, ...data }));
    };

    const handleUserUpdate = (data: Partial<User> | null) => {
      if (!data) data = createDefault.user();
      setUser((prev) => ({ ...prev, ...data }));
    };

    // Effects
    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.SERVER_UPDATE]: handleServerUpdate,
        [SocketServerEvent.USER_UPDATE]: handleUserUpdate,
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
      if (!socket || !serverId || !userId) return;
      if (refreshRef.current) return;
      socket.send.refreshServer({ serverId: serverId });
      socket.send.refreshUser({ userId: userId });
      refreshRef.current = true;
    }, [socket, serverId, userId]);

    return (
      <div className={Popup['popupContainer']}>
        <div className={Popup['popupBody']}>
          <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            {/* Left Sidebar */}
            <div className={EditServer['left']}>
              <div className={EditServer['tabs']}>
                {[
                  lang.tr.viewGroupInfo,
                  lang.tr.announcement,
                  lang.tr.memberManagement,
                  lang.tr.accessPermission,
                  lang.tr.memberApplicationManagement,
                  lang.tr.blacklistManagement,
                ].map((title, index) => (
                  <div
                    className={`${EditServer['item']} ${
                      activeTabIndex === index ? EditServer['active'] : ''
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
            <div className={EditServer['right']}>
              <div className={EditServer['body']}>
                {activeTabIndex === 0 ? (
                  <>
                    <div
                      className={`${EditServer['inputGroup']} ${EditServer['row']}`}
                    >
                      <div
                        className={`${EditServer['inputGroup']} ${EditServer['col']}`}
                      >
                        <div
                          className={`${EditServer['inputGroup']} ${EditServer['row']}`}
                        >
                          <div
                            className={`${Popup['inputBox']} ${Popup['col']}`}
                          >
                            <div className={Popup['label']}>{lang.tr.name}</div>
                            <input
                              type="text"
                              value={serverName}
                              onChange={(e) => {
                                setServer((prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }));
                              }}
                            />
                          </div>
                          <div
                            className={`${Popup['inputBox']} ${Popup['col']}`}
                          >
                            <div className={Popup['label']}>{lang.tr.id}</div>
                            <input
                              type="text"
                              value={serverDisplayId}
                              disabled
                            />
                          </div>
                        </div>
                        <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                          <div className={Popup['label']}>{lang.tr.slogan}</div>
                          <input
                            type="text"
                            value={serverSlogan}
                            onChange={(e) => {
                              setServer((prev) => ({
                                ...prev,
                                slogan: e.target.value,
                              }));
                            }}
                          />
                        </div>
                        <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                          <div className={Popup['label']}>{lang.tr.type}</div>
                          <select
                            value={serverType}
                            onChange={(e) => {
                              setServer((prev) => ({
                                ...prev,
                                type: e.target.value as Server['type'],
                              }));
                            }}
                          >
                            <option>{lang.tr.other}</option>
                            <option>{lang.tr.game}</option>
                            <option>{lang.tr.entertainment}</option>
                          </select>
                        </div>
                      </div>
                      <div className={EditServer['avatarWrapper']}>
                        <div
                          className={EditServer['avatarPicture']}
                          style={{
                            backgroundImage: `url(${serverAvatar})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        />
                        <input
                          type="file"
                          id="avatar-upload"
                          className="hidden"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          ref={setServerIcon}
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
                            reader.onloadend = () => {
                              setServer((prev) => ({
                                ...prev,
                                avatar: reader.result as string,
                              }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        <label
                          htmlFor="avatar-upload"
                          className={Popup['button']}
                          style={{ marginTop: '10px' }}
                          onClick={(e) => {
                            e.preventDefault();
                            setServerIcon.current?.click();
                          }}
                        >
                          {lang.tr.changeImage}
                        </label>
                      </div>
                    </div>
                    <div style={{ minHeight: '10px' }} />
                    <div
                      className={`${EditServer['inputGroup']} ${EditServer['col']}`}
                    >
                      <div
                        className={`${EditServer['inputGroup']} ${EditServer['row']}`}
                      >
                        <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                          <div className={Popup['label']}>{lang.tr.level}</div>
                          <input type="text" value={serverLevel} disabled />
                        </div>
                        <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                          <div className={Popup['label']}>
                            {lang.tr.creationTime}
                          </div>
                          <input
                            type="text"
                            value={new Date(serverCreatedAt).toLocaleString()}
                            disabled
                          />
                        </div>
                        <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                          <div
                            className={`${Popup['label']} ${EditServer['wealthCoinIcon']}`}
                          >
                            {lang.tr.wealth}
                          </div>
                          <input type="text" value={serverWealth} disabled />
                        </div>
                      </div>
                      <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                        <div className={Popup['label']}>
                          {lang.tr.description}
                        </div>
                        <textarea
                          value={serverDescription}
                          onChange={(e) =>
                            setServer((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </>
                ) : activeTabIndex === 1 ? (
                  <>
                    <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                      <div className={Popup['label']}>
                        {lang.tr.inputAnnouncement}
                      </div>
                      <textarea
                        style={{ minHeight: '200px' }}
                        value={serverAnnouncement}
                        onChange={(e) =>
                          setServer((prev) => ({
                            ...prev,
                            announcement: e.target.value,
                          }))
                        }
                      />
                      <div className={Popup['label']}>
                        {lang.tr.markdownSupport}
                      </div>
                    </div>
                    {/* <div
                      className={Popup['button']}
                      onClick={() => setIsPreviewMode(!isPreviewMode)}
                    >
                      {isPreviewMode ? lang.tr.edit : lang.tr.preview}
                    </div> */}
                  </>
                ) : activeTabIndex === 2 ? (
                  <>
                    <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                      <div className={Popup['label']}>
                        {lang.tr.members}: {serverMembers.length}
                      </div>
                      {/* <div className={EditServer['search']}>
                        <input
                          type="text"
                          placeholder={lang.tr.searchPlaceholder}
                          value={searchText}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSearchText(e.target.value)
                          }
                        />
                      </div> */}
                      <table style={{ minHeight: '280px' }}>
                        <thead>
                          <tr>
                            {MEMBER_FIELDS.map((field) => (
                              <th
                                key={field.field}
                                onClick={() =>
                                  handleMemberSort(
                                    field.field as keyof ServerMember,
                                  )
                                }
                              >
                                {field.name}
                                <span className="absolute right-0">
                                  {sortField === field.field &&
                                    (sortState === 1 ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    ))}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {serverMembers.map((member) => {
                            const {
                              id: memberId,
                              userId: memberUserId,
                              serverId: memberServerId,
                              nickname: memberNickname,
                              name: memberName,
                              gender: memberGender,
                              permissionLevel: memberPermissionLevel,
                              contribution: memberContribution,
                              createdAt: memberJoinDate,
                            } = member;
                            return (
                              <tr
                                key={memberId}
                                onContextMenu={(e) => {
                                  if (memberUserId === userId) return;
                                  contextMenu.showContextMenu(
                                    e.pageX,
                                    e.pageY,
                                    [
                                      {
                                        label: '傳送即時訊息',
                                        onClick: () => {},
                                      },
                                      {
                                        label: '檢視個人檔案',
                                        onClick: () => {},
                                      },
                                      {
                                        label: '新增好友',
                                        onClick: () => {},
                                      },
                                      {
                                        label: '拒聽此人語音',
                                        onClick: () => {},
                                      },
                                      {
                                        label: '修改群名片',
                                        onClick: () => {},
                                      },
                                      {
                                        label: lang.tr.moveToMyChannel,
                                        onClick: () => handleUserMove(),
                                      },
                                      {
                                        label: '禁止此人語音',
                                        onClick: () => {},
                                      },
                                      {
                                        label: '禁止文字',
                                        onClick: () => {},
                                      },
                                      {
                                        label: lang.tr.kickOut,
                                        onClick: () => handleKickServer(),
                                      },
                                      {
                                        label: lang.tr.block,
                                        onClick: () => handleBlockUser(),
                                      },
                                      {
                                        label: lang.tr.memberManagement,
                                        onClick: () => {},
                                      },
                                      {
                                        label: lang.tr.inviteToBeMember,
                                        onClick: () => {},
                                      },
                                    ],
                                  );
                                }}
                              >
                                <td>
                                  <div
                                    className={`${permission[memberGender]} ${
                                      permission[`lv-${memberPermissionLevel}`]
                                    }`}
                                  />
                                  {memberNickname || memberName}
                                </td>
                                <td>
                                  {lang.getPermissionText(
                                    memberPermissionLevel,
                                  )}
                                </td>
                                <td>{memberContribution}</td>
                                <td>
                                  {new Date(memberJoinDate).toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={EditServer['hintText']}>
                      {lang.tr.rightClickToProcess}
                    </div>
                  </>
                ) : activeTabIndex === 3 ? (
                  <>
                    <div
                      className={`${EditServer['inputGroup']} ${EditServer['col']}`}
                    >
                      <div className={Popup['label']}>
                        {lang.tr.accessPermission}
                      </div>
                      <div className={`${Popup['inputBox']} ${Popup['row']}`}>
                        <input
                          type="radio"
                          id="public"
                          name="permission"
                          value="public"
                          className="mr-3"
                          checked={serverVisibility === 'public'}
                          onChange={(e) => {
                            if (e.target.checked)
                              setServer((prev) => ({
                                ...prev,
                                visibility: 'public',
                              }));
                          }}
                        />
                        <div className={Popup['label']}>
                          {lang.tr.publicGroup}
                        </div>
                      </div>
                      <div className={`${Popup['inputBox']} ${Popup['row']}`}>
                        <input
                          type="radio"
                          id="members"
                          name="permission"
                          value="members"
                          className="mr-3"
                          checked={serverVisibility === 'private'}
                          onChange={(e) => {
                            if (e.target.checked)
                              setServer((prev) => ({
                                ...prev,
                                visibility: 'private',
                              }));
                          }}
                        />
                        <div>
                          <div className={Popup['label']}>
                            {lang.tr.semiPublicGroup}
                          </div>
                          <div className={EditServer['hintText']}>
                            {lang.tr.semiPublicGroupDescription}
                          </div>
                        </div>
                      </div>
                      <div className={`${Popup['inputBox']} ${Popup['row']}`}>
                        <input
                          type="radio"
                          id="private"
                          name="permission"
                          value="private"
                          className="mr-3"
                          checked={serverVisibility === 'invisible'}
                          onChange={(e) => {
                            if (e.target.checked)
                              setServer((prev) => ({
                                ...prev,
                                visibility: 'invisible',
                              }));
                          }}
                        />
                        <div>
                          <div className={Popup['label']}>
                            {lang.tr.privateGroup}
                          </div>
                          <div className={EditServer['hintText']}>
                            {lang.tr.privateGroupDescription}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : activeTabIndex === 4 ? (
                  <>
                    <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                      <div className={Popup['label']}>
                        {lang.tr.applicants}: {serverApplications.length}
                      </div>
                      {/* <div className={EditServer['search']}>
                        <input
                          type="text"
                          placeholder={lang.tr.searchPlaceholder}
                          value={searchText}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSearchText(e.target.value)
                          }
                        />
                      </div> */}
                      <table style={{ minHeight: '280px' }}>
                        <thead>
                          <tr>
                            {APPLICATION_FIELDS.map((field) => (
                              <th
                                key={field.field}
                                onClick={() =>
                                  handleApplicationSort(
                                    field.field as keyof MemberApplication,
                                  )
                                }
                              >
                                {field.name}
                                <span className="absolute right-0">
                                  {sortField === field.field &&
                                    (sortState === 1 ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    ))}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {serverApplications.map((application) => {
                            const {
                              id: applicationId,
                              userId: applicationUserId,
                              serverId: applicationServerId,
                              name: applicationName,
                              description: applicationDescription,
                            } = application;
                            return (
                              <tr
                                key={applicationId}
                                onContextMenu={(e) => {
                                  contextMenu.showContextMenu(
                                    e.pageX,
                                    e.pageY,
                                    [],
                                  );
                                }}
                              >
                                <td>{applicationName}</td>
                                <td>{applicationDescription}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={EditServer['hintText']}>
                      {lang.tr.rightClickToProcess}
                    </div>
                  </>
                ) : activeTabIndex === 5 ? (
                  <>
                    <div className={`${Popup['inputBox']} ${Popup['col']}`}>
                      <div className={Popup['label']}>
                        {lang.tr.blacklist}: {serverBlockMembers.length}
                      </div>
                      {/* <div className={EditServer['search']}>
                        <input
                          type="text"
                          placeholder={lang.tr.searchPlaceholder}
                          value={searchText}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            setSearchText(e.target.value)
                          }
                        />
                      </div> */}
                      <table style={{ minHeight: '280px' }}>
                        <thead>
                          <tr>
                            {BLOCK_MEMBER_FIELDS.map((field) => (
                              <th
                                key={field.field}
                                onClick={() =>
                                  handleBlockMemberSort(
                                    field.field as keyof ServerMember,
                                  )
                                }
                              >
                                {field.name}
                                <span className="absolute right-0">
                                  {sortField === field.field &&
                                    (sortState === 1 ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    ))}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {serverBlockMembers.map((blockMember) => {
                            const {
                              id: blockMemberId,
                              userId: blockMemberUserId,
                              serverId: blockMemberServerId,
                              nickname: blockMemberNickname,
                              name: blockMemberName,
                              contribution: blockMemberContribution,
                            } = blockMember;
                            return (
                              <tr
                                key={blockMemberId}
                                onContextMenu={(e) => {
                                  contextMenu.showContextMenu(
                                    e.pageX,
                                    e.pageY,
                                    [],
                                  );
                                }}
                              >
                                <td>
                                  {blockMemberNickname || blockMemberName}
                                </td>
                                <td>{blockMemberContribution}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className={EditServer['hintText']}>
                      {lang.tr.rightClickToProcess}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={Popup['popupFooter']}>
          <button
            className={Popup['button']}
            onClick={() => handleUpdateServer()}
          >
            {lang.tr.confirm}
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
  },
);

EditServerModal.displayName = 'EditServerModal';

export default EditServerModal;
