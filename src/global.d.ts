export {};

interface DiscordPresenceData {
  details?: string;
  state?: string;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  resetTimer?: boolean;
  buttons?: Array<{
    label: string;
    url: string;
  }>;
}

declare global {
  interface Window {
    electron?: {
      openPopup: (page: string) => void;
      openWindow: (page: string) => void;
      close: () => void;
      minimize: () => void;
      reload: () => void;
      openDevtool: () => void;

      updateDiscordPresence: (presenceData: DiscordPresenceData) => void;
    };
  }
}
