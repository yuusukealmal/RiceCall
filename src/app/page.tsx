/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { CircleX } from 'lucide-react';

// CSS
import header from '@/styles/common/header.module.css';

// Types
import type { Channel, Server, User } from '@/types';

// Pages
import FriendPage from '@/components/pages/FriendPage';
import HomePage from '@/components/pages/HomePage';
import ServerPage from '@/components/pages/ServerPage';

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner';
import UserSettingModal from '@/components/modals/UserSettingModal';

// Utils
import { measureLatency } from '@/utils/measureLatency';

// Providers
import { useSocket } from '@/providers/SocketProvider';

// Services
import { ipcService } from '@/services/ipc.service';

// Redux
import store from '@/redux/store';
import { clearServer, setServer } from '@/redux/serverSlice';
import { clearUser, setUser } from '@/redux/userSlice';
import { clearChannel, setChannel } from '@/redux/channelSlice';

interface HeaderProps {
  selectedId?: number;
  onSelect?: (tabId: number) => void;
}

const Header: React.FC<HeaderProps> = React.memo(
  ({ selectedId = 1, onSelect }) => {
    // Redux
    const user = useSelector((state: { user: User | null }) => state.user);
    const server = useSelector(
      (state: { server: Server | null }) => state.server,
    );

    // Socket
    const socket = useSocket();

    const handleDisconnect = () => {
      console.log('Socket disconnected');
      store.dispatch(clearChannel());
      store.dispatch(clearServer());
      store.dispatch(clearUser());
      localStorage.removeItem('sessionToken');
    };
    const handleUserConnect = (user: any) => {
      console.log('User connected: ', user);
      store.dispatch(setUser(user));
    };
    const handleUserDisconnect = () => {
      console.log('User disconnected');
      store.dispatch(clearChannel());
      store.dispatch(clearServer());
      store.dispatch(clearUser());
      localStorage.removeItem('sessionToken');
    };
    const handleUserUpdate = (data: Partial<User>) => {
      console.log('User update: ', data);
      const user_ = store.getState().user;
      if (!user_) return;
      store.dispatch(setUser({ ...user_, ...data }));
    };
    const handleServerConnect = (server: Server) => {
      console.log('Server connected: ', server);
      store.dispatch(setServer(server));
    };
    const handleServerDisconnect = () => {
      console.log('Server disconnected');
      store.dispatch(clearServer());
    };
    const handleServerUpdate = (data: Partial<Server>) => {
      console.log('Server update: ', data);
      const server_ = store.getState().server;
      if (!server_) return;
      store.dispatch(setServer({ ...server_, ...data }));
    };
    const handleChannelConnect = (channel: Channel) => {
      console.log('Channel connected: ', channel);
      store.dispatch(setChannel(channel));
    };
    const handleChannelDisconnect = () => {
      console.log('Channel disconnected');
      store.dispatch(clearChannel());
    };
    const handleChannelUpdate = (data: Partial<Channel>) => {
      console.log('Channel update: ', data);
      const channel_ = store.getState().channel;
      if (!channel_) return;
      store.dispatch(setChannel({ ...channel_, ...data }));
    };
    const handleLogout = () => {
      ipcService.auth.logout();
      localStorage.removeItem('autoLogin');
      localStorage.removeItem('encryptedPassword');
      localStorage.removeItem('sessionToken');
    };
    const handleLeaveServer = () => {
      if (!user) return;
      socket?.send.disconnectServer({ serverId: user.currentServerId });
    };
    const handleUpdateStatus = (status: User['status']) => {
      socket?.send.updateUser({ user: { status } });
    };

    useEffect(() => {
      socket?.on.connect(() => console.log('Socket connected'));
      socket?.on.error((error: any) => console.error(error));
      socket?.on.disconnect(handleDisconnect);
      socket?.on.userConnect(handleUserConnect);
      socket?.on.userDisconnect(handleUserDisconnect);
      socket?.on.userUpdate(handleUserUpdate);
      socket?.on.serverConnect(handleServerConnect);
      socket?.on.serverDisconnect(handleServerDisconnect);
      socket?.on.serverUpdate(handleServerUpdate);
      socket?.on.channelConnect(handleChannelConnect);
      socket?.on.channelDisconnect(handleChannelDisconnect);
      socket?.on.channelUpdate(handleChannelUpdate);
    }, [socket]);

    // Fullscreen Control
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreen = () => {
      if (!isFullscreen) {
        ipcService.getAvailability()
          ? ipcService.window.maximize()
          : document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        ipcService.getAvailability()
          ? ipcService.window.unmaximize()
          : document.exitFullscreen();
        setIsFullscreen(false);
      }
    };

    const handleMinimize = () => {
      if (ipcService.getAvailability()) ipcService.window.minimize();
      else console.warn('IPC not available - not in Electron environment');
    };

    const handleClose = () => {
      if (ipcService.getAvailability()) ipcService.window.close();
      else console.warn('IPC not available - not in Electron environment');
    };

    const handleOpenDevtool = () => {
      if (ipcService.getAvailability()) ipcService.window.openDevtool();
      else console.warn('IPC not available - not in Electron environment');
    };

    // Menu Control
    const [showMenu, setShowMenu] = useState(false);

    // User Setting Control
    const [showUserSetting, setShowUserSetting] = useState<boolean>(false);

    // Status Dropdown Control
    const [showStatusDropdown, setShowStatusDropdown] =
      useState<boolean>(false);

    // Tab Control
    const MAIN_TABS = React.useMemo(() => {
      const tabs = [];
      if (user) {
        tabs.push({
          id: 1,
          label: '首頁',
          onClick: () => {},
        });
        tabs.push({
          id: 2,
          label: '好友',
          onClick: () => {},
        });
      }
      if (server) {
        tabs.push({
          id: 3,
          label: server.name,
          onClick: () => {},
        });
      }
      return tabs;
    }, [user, server]);

    // Status Dropdown Control
    const STATUS_OPTIONS = [
      { status: 'online', label: '上線' },
      { status: 'dnd', label: '請勿打擾' },
      { status: 'idle', label: '閒置' },
      { status: 'gn', label: '離線' },
    ];

    const userName = user?.name ?? 'Unknown';
    const userStatus = user?.status ?? 'online';

    return (
      <div className={header['header']}>
        {/* Title */}
        <div className={`${header['titleBox']} ${header['big']}`}></div>
        {/* User Status */}
        <div className={header['userStatus']}>
          {showUserSetting && (
            <UserSettingModal onClose={() => setShowUserSetting(false)} />
          )}
          <div className={header['nameDisplay']}>{userName}</div>
          <div
            className={header['statusBox']}
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          >
            <div className={header['statusDisplay']} datatype={userStatus} />
            <div className={header['statusTriangle']} />
            <div
              className={`${header['statusDropdown']} ${
                showStatusDropdown ? '' : header['hidden']
              }`}
            >
              {STATUS_OPTIONS.map((option) => (
                <div
                  key={option.status}
                  className={header['option']}
                  datatype={option.status}
                  onClick={() => {
                    handleUpdateStatus(option.status as User['status']);
                    setShowStatusDropdown(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {/* Main Tabs */}
        <div className={header['mainTabs']}>
          {MAIN_TABS.map((Tab) => {
            const TabId = Tab.id;
            const TabLable = Tab.label;

            return (
              <div
                key={`Tabs-${TabId}`}
                className={`${header['tab']} ${
                  TabId === selectedId ? header['selected'] : ''
                }`}
                onClick={() => {
                  onSelect?.(TabId);
                  Tab.onClick();
                }}
              >
                <div className={header['tabLable']}>{TabLable}</div>
                <div className={header['tabBg']}></div>
                {TabId > 2 && (
                  <CircleX
                    onClick={() => handleLeaveServer()}
                    size={16}
                    className={header['tabClose']}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Buttons */}
        <div className={header['buttons']}>
          <div className={header['gift']} />
          <div className={header['game']} />
          <div className={header['notice']} />
          <div className={header['spliter']} />
          <div
            className={header['menu']}
            onClick={() => setShowMenu(!showMenu)}
          >
            <div
              className={`${header['menuDropDown']} ${
                showMenu ? '' : header['hidden']
              }`}
            >
              <div
                className={`${header['option']} ${header['hasImage']}`}
                data-type="system-setting"
                data-key="30066"
                onClick={() => handleOpenDevtool()}
              >
                系統設定
              </div>
              <div
                className={`${header['option']} ${header['hasImage']}`}
                data-type="message-history"
                data-key="30136"
              >
                訊息紀錄
              </div>
              <div
                className={`${header['option']} ${header['hasImage']}`}
                data-type="change-theme"
                data-key="60028"
              >
                更換主題
              </div>
              <div
                className={header['option']}
                data-type="feed-back"
                data-key="30039"
              >
                意見反饋
              </div>
              <div
                className={`${header['option']} ${header['hasImage']} ${header['hasSubmenu']}`}
                data-type="language-select"
              >
                <span data-key="30374">語言選擇</span>
                <div
                  className={`${header['menuDropDown']} ${header['hidden']}`}
                >
                  <div className={header['option']} data-lang="tw">
                    繁體中文
                  </div>
                  <div className={header['option']} data-lang="cn">
                    简体中文
                  </div>
                  <div className={header['option']} data-lang="en">
                    English
                  </div>
                  <div className={header['option']} data-lang="jp">
                    日本語
                  </div>
                  <div className={header['option']} data-lang="ru">
                    русский язык
                  </div>
                </div>
              </div>
              <div
                className={header['option']}
                data-type="logout"
                data-key="30060"
                onClick={() => handleLogout()}
              >
                登出
              </div>
              <div
                className={`${header['option']} ${header['hasImage']}`}
                data-type="exit"
                data-key="30061"
              >
                退出
              </div>
            </div>
          </div>
          <div className={header['minimize']} onClick={handleMinimize} />
          <div
            className={isFullscreen ? header['restore'] : header['maxsize']}
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
          <div className={header['close']} onClick={handleClose} />
        </div>
      </div>
    );
  },
);

Header.displayName = 'Header';

const Home = () => {
  // Redux
  const server = useSelector(
    (state: { server: Server | null }) => state.server,
  );
  const user = useSelector((state: { user: User | null }) => state.user);

  // Tab Control
  const [selectedTabId, setSelectedTabId] = useState<number>(1);

  useEffect(() => {
    if (server) setSelectedTabId(3);
    else setSelectedTabId(1);
  }, [server]);

  const getMainContent = () => {
    if (!user) return <LoadingSpinner />;
    else {
      switch (selectedTabId) {
        case 1:
          return <HomePage />;
        case 2:
          return <FriendPage />;
        case 3:
          if (!server) return;
          return <ServerPage />;
      }
    }
  };

  return (
    <>
      <Header
        selectedId={selectedTabId}
        onSelect={(tabId) => setSelectedTabId(tabId)}
      />
      {/* Main Content */}
      <div className="content">{getMainContent()}</div>
    </>
  );
};

Home.displayName = 'Home';

export default Home;
