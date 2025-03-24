import dynamic from 'next/dynamic';
import React, { useState, useEffect, useRef } from 'react';

// CSS
import homePage from '@/styles/homePage.module.css';

// Components
import ServerListViewer from '@/components/viewers/ServerListViewer';

// Type
import {
  PopupType,
  Server,
  SocketServerEvent,
  User,
  ServerListSectionProps,
} from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';

interface HomePageProps {
  user: User;
  handleUserUpdate: (data: Partial<User> | null) => void;
}

const ServerListSection: React.FC<ServerListSectionProps> = ({
  title,
  servers,
  user,
}) => {
  const [showAll, setShowAll] = useState(false);
  const lang = useLanguage();

  const displayedServers = showAll ? servers : servers.slice(0, 6);
  const hasMore = servers.length > 6;

  return (
    <div className={homePage['myGroupsItem']}>
      <div className={homePage['myGroupsTitle']}>{title}</div>
      <ServerListViewer user={user} servers={displayedServers} />
      {hasMore && (
        <button
          className={`${homePage['viewMoreBtn']} ${
            homePage[showAll ? 'more' : 'less']
          }`}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? '檢視較少' : '檢視更多'}
        </button>
      )}
    </div>
  );
};

const HomePageComponent: React.FC<HomePageProps> = React.memo(
  ({ user, handleUserUpdate }) => {
    // Hooks
    const lang = useLanguage();
    const socket = useSocket();

    // Refs
    const refreshed = useRef(false);

    // States
    const [searchResults, setSearchResults] = useState<Server[]>([]);

    // Variables
    const {
      id: userId,
      name: userName,
      ownedServers: userOwnedServers = [],
      recentServers: userRecentServers = [],
      favServers: userFavServers = [],
    } = user;

    // Handlers
    const handleSearchServer = (query: string) => {
      if (!socket) return;
      socket.send.searchServer({ query });
    };

    const handleServerSearch = (servers: Server[]) => {
      setSearchResults(servers);
    };

    const handleOpenCreateServer = (userId: User['id']) => {
      ipcService.popup.open(PopupType.CREATE_SERVER);
      ipcService.initialData.onRequest(PopupType.CREATE_SERVER, { userId });
    };

    // Effects
    useEffect(() => {
      if (!socket) return;

      const eventHandlers = {
        [SocketServerEvent.SERVER_SEARCH]: handleServerSearch,
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
      if (!userId || refreshed.current) return;
      const refresh = async () => {
        refreshed.current = true;
        const user = await refreshService.user({ userId: userId });
        handleUserUpdate(user);
      };
      refresh();
    }, [userId, handleUserUpdate]);

    useEffect(() => {
      if (!lang) return;
      ipcService.discord.updatePresence({
        details: lang.tr.RPCHomePage,
        state: `${lang.tr.RPCUser} ${userName}`,
        largeImageKey: 'app_icon',
        largeImageText: 'RC Voice',
        smallImageKey: 'home_icon',
        smallImageText: lang.tr.RPCHome,
        timestamp: Date.now(),
        buttons: [
          {
            label: lang.tr.RPCJoinServer,
            url: 'https://discord.gg/adCWzv6wwS',
          },
        ],
      });
    }, [lang, userName]);

    return (
      <div className={homePage['homeWrapper']}>
        {/* Header */}
        <header className={homePage['homeHeader']}>
          <div className={homePage['left']}>
            <div className={homePage['backBtn']} />
            <div className={homePage['forwardBtn']} />
            <div className={homePage['searchBar']}>
              <input
                type="search"
                placeholder={lang.tr.searchPlaceholder}
                className={homePage['searchInput']}
                onKeyDown={(e) => {
                  if (e.key != 'Enter') return;
                  if (e.currentTarget.value.trim() === '') return;
                  handleSearchServer(e.currentTarget.value);
                }}
              />
              <div className={homePage['searchIcon']} />
            </div>
          </div>
          <div className={homePage['mid']}>
            <button
              className={`${homePage['navegateItem']} ${homePage['active']}`}
            >
              {lang.tr.home}
            </button>
            <button className={homePage['navegateItem']}>
              <div></div>
              {lang.tr.game}
            </button>
            <button className={homePage['navegateItem']}>
              <div></div>
              {lang.tr.live}
            </button>
          </div>
          <div className={homePage['right']}>
            <button
              className={homePage['navegateItem']}
              onClick={() => handleOpenCreateServer(userId)}
            >
              <div></div>
              {lang.tr.createGroup}
            </button>
            <button className={homePage['navegateItem']}>
              <div></div>
              {lang.tr.personalExclusive}
            </button>
          </div>
        </header>
        {/* Main Content */}
        <main className={homePage['myGroupsWrapper']}>
          <div className={homePage['myGroupsContain']}>
            <div className={homePage['myGroupsView']}>
              {searchResults.length > 0 && (
                <ServerListSection
                  title={lang.tr.searchResult}
                  servers={searchResults}
                  user={user}
                />
              )}
              <ServerListSection
                title={lang.tr.recentVisits}
                servers={userRecentServers}
                user={user}
              />
              <ServerListSection
                title={lang.tr.myGroups}
                servers={userOwnedServers}
                user={user}
              />
              <ServerListSection
                title={lang.tr.favoriteGroups}
                servers={userFavServers}
                user={user}
              />
            </div>
          </div>
        </main>
      </div>
    );
  },
);

HomePageComponent.displayName = 'HomePageComponent';

// use dynamic import to disable SSR
const HomePage = dynamic(() => Promise.resolve(HomePageComponent), {
  ssr: false,
});

export default HomePage;
