/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Types
import {
  Channel,
  Server,
  User,
  SocketServerEvent,
  SocketClientEvent,
} from '@/types';

// Utils
import { errorHandler } from '@/utils/errorHandler';

// Redux
import store from '@/redux/store';
import { clearServer, setServer } from '@/redux/serverSlice';
import { clearUser, setUser } from '@/redux/userSlice';
import { clearSessionToken } from '@/redux/sessionTokenSlice';
import { clearChannel, setChannel } from '@/redux/channelSlice';

// Services
import { ipcService } from '@/services/ipc.service';

// const WS_URL = 'ws://localhost:4500';

type SocketContextType = {
  event?: {
    send: Record<SocketClientEvent, (data: any) => void>;
    on: Record<SocketServerEvent, (callback: (data: any) => void) => void>;
  };
};

const SocketContext = createContext<SocketContextType>({});

export const useSocket = () => {
  const context = useContext(SocketContext);
  return context.event;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

const SocketProvider = ({ children }: SocketProviderProps) => {
  const [event, setEvent] = useState<SocketContextType['event']>();

  const handleDisconnect = () => {
    console.log('Socket disconnected');
    store.dispatch(clearServer());
    store.dispatch(clearUser());
    store.dispatch(clearSessionToken());
    localStorage.removeItem('sessionToken');
  };
  const handleUserConnect = (user: any) => {
    console.log('User connected: ', user);
    store.dispatch(setUser(user));
  };
  const handleUserDisconnect = () => {
    console.log('User disconnected');
    store.dispatch(clearServer());
    store.dispatch(clearUser());
    store.dispatch(clearSessionToken());
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

  useEffect(() => {
    const newEvent = {
      send: Object.values(SocketClientEvent).reduce((acc, event) => {
        acc[event] = (data: any) => ipcService.sendSocketEvent(event, data);
        return acc;
      }, {} as Record<SocketClientEvent, (data: any) => void>),
      on: Object.values(SocketServerEvent).reduce((acc, event) => {
        acc[event] = (callback: (data: any) => void) =>
          ipcService.onSocketEvent(event, callback);
        return acc;
      }, {} as Record<SocketServerEvent, (callback: (data: any) => void) => void>),
    };
    setEvent(newEvent);

    return () => {
      Object.values(SocketServerEvent).map((event) =>
        ipcService.removeListener(event),
      );
    };
  }, []);

  // Initialize socket event listeners
  useEffect(() => {
    if (ipcService.getAvailability()) {
      ipcService.requestInitialData();
      ipcService.onInitialData((data) => {
        console.log('Initial data:', data);
        store.dispatch(setUser(data.user));
        store.dispatch(setServer(data.server));
        store.dispatch(setChannel(data.channel));
      });

      event?.on.connect(() => console.log('Socket connected'));
      event?.on.error((error: any) => console.error(error));
      event?.on.disconnect(handleDisconnect);
      event?.on.userConnect(handleUserConnect);
      event?.on.userDisconnect(handleUserDisconnect);
      event?.on.userUpdate(handleUserUpdate);
      event?.on.serverConnect(handleServerConnect);
      event?.on.serverDisconnect(handleServerDisconnect);
      event?.on.serverUpdate(handleServerUpdate);
      event?.on.channelConnect(handleChannelConnect);
      event?.on.channelDisconnect(handleChannelDisconnect);
      event?.on.channelUpdate(handleChannelUpdate);
    }
  }, [event]);

  return (
    <SocketContext.Provider value={{ event }}>
      {children}
    </SocketContext.Provider>
  );
};

SocketProvider.displayName = 'SocketProvider';

export default SocketProvider;
