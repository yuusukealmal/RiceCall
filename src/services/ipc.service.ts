/* eslint-disable @typescript-eslint/no-explicit-any */
import { discordPresence, SocketClientEvent, SocketServerEvent } from '@/types';

// Safe reference to electron's ipcRenderer
let ipcRenderer: any = null;

// Initialize ipcRenderer only in client-side and Electron environment
if (typeof window !== 'undefined' && window.require) {
  try {
    const electron = window.require('electron');
    ipcRenderer = electron.ipcRenderer;
  } catch (error) {
    console.warn('Not in Electron environment:', error);
  }
}

export const isElectron = !!ipcRenderer;

export const ipcService = {
  // Socket event methods
  sendSocketEvent: (event: SocketClientEvent, data: any) => {
    if (isElectron) {
      ipcRenderer.send(event, data);
    } else {
      console.warn('IPC not available - not in Electron environment');
    }
  },
  onSocketEvent: (event: SocketServerEvent, callback: (data: any) => void) => {
    if (isElectron) {
      ipcRenderer.on(event, (_: any, data: any) => callback(data));
    } else {
      console.warn('IPC not available - not in Electron environment');
    }
  },

  // Remove specific listener
  removeListener: (event: string) => {
    if (isElectron) {
      ipcRenderer.removeAllListeners(event);
    } else {
      console.warn('IPC not available - not in Electron environment');
    }
  },

  // Initial data methods
  initialData: {
    request: (to: string, callback: (data: any) => void) => {
      if (isElectron) {
        ipcRenderer.send('request-initial-data', to);
        ipcRenderer.on(
          'response-initial-data',
          (_: any, from: string, data: any) => {
            if (from != to) return;
            callback(data);
            ipcRenderer.removeAllListeners('response-initial-data');
          },
        );
      } else {
        console.warn('IPC not available - not in Electron environment');
      }
    },
    onRequest: (host: string, data: any) => {
      if (isElectron) {
        ipcRenderer.on('request-initial-data', (_: any, to: string) => {
          if (to != host) return;
          ipcRenderer.send('response-initial-data', host, data);
          ipcRenderer.removeAllListeners('request-initial-data');
        });
      } else {
        console.warn('IPC not available - not in Electron environment');
      }
    },
  },

  // Window control methods
  window: {
    minimize: () => {
      if (isElectron) {
        ipcRenderer.send('window-control', 'minimize');
      } else {
        window.close();
      }
    },
    maximize: () => {
      if (isElectron) {
        ipcRenderer.send('window-control', 'maximize');
      } else {
        document.documentElement.requestFullscreen();
      }
    },
    unmaximize: () => {
      if (isElectron) {
        ipcRenderer.send('window-control', 'unmaximize');
      } else {
        document.exitFullscreen();
      }
    },
    close: () => {
      if (isElectron) {
        ipcRenderer.send('window-control', 'close');
      } else {
        window.close();
      }
    },
    onMaximize: (callback: () => void) => {
      if (isElectron) {
        ipcRenderer.on('window-maximized', callback);
      }
    },
    onUnmaximize: (callback: () => void) => {
      if (isElectron) {
        ipcRenderer.on('window-unmaximized', callback);
      }
    },
    offMaximize: (callback: () => void) => {
      if (isElectron) {
        ipcRenderer.removeListener('window-maximized', callback);
      }
    },
    offUnmaximize: (callback: () => void) => {
      if (isElectron) {
        ipcRenderer.removeListener('window-unmaximized', callback);
      }
    },
    // FIXME: THIS SHOULD BE REMOVED
    openDevtool: () => {
      if (isElectron) {
        ipcRenderer.send('openDevtool');
      }
    },
  },

  popup: {
    open: (type: string, height?: number, width?: number) => {
      if (isElectron) {
        ipcRenderer.send('open-popup', type, height, width);
      }
    },
    submit: (to: string) => {
      if (isElectron) {
        ipcRenderer.send('popup-submit', to);
      }
    },
    onSubmit: (host: string, callback: () => void) => {
      if (isElectron) {
        ipcRenderer.on('popup-submit', (_: any, to: string) => {
          if (to != host) return;
          callback();
          ipcRenderer.removeAllListeners('popup-submit');
        });
      }
    },
  },

  // Auth related methods
  auth: {
    login: (token: string) => {
      if (isElectron) {
        ipcRenderer.send('login', token);
      }
    },
    logout: () => {
      if (isElectron) {
        ipcRenderer.send('logout');
      }
    },
  },

  discord: {
    updatePresence: (presence: discordPresence) => {
      if (isElectron) {
        ipcRenderer.send('update-discord-presence', presence);
      }
    },
  },
};
