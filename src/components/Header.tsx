/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import React, { useState } from 'react';

// CSS
import styles from '@/styles/common/header.module.css';

// Services
import { ipcService } from '@/services/ipc.service';

interface TitleType {
  title?: string;
  button?: Array<string>;
}

interface HeaderProps {
  title?: TitleType;
}

const Header: React.FC<HeaderProps> = React.memo(({ title }) => {
  // Fullscreen Control
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreen = () => {
    isFullscreen
      ? ipcService.window.unmaximize()
      : ipcService.window.maximize();
    setIsFullscreen(!isFullscreen);
  };

  const handleMinimize = () => {
    ipcService.window.minimize();
  };

  const handleClose = () => {
    ipcService.window.close();
  };

  return (
    <div className={styles['header']}>
      <div className={styles['titleBox']}>
        {title?.title && <span className={styles['title']}>{title.title}</span>}
      </div>
      <div className={styles['buttons']}>
        {title?.button?.includes('minimize') && (
          <div className={styles['minimize']} onClick={handleMinimize} />
        )}
        {title?.button?.includes('maxsize') && (
          <div
            className={isFullscreen ? styles['restore'] : styles['maxsize']}
            onClick={handleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          />
        )}
        <div className={styles['close']} onClick={handleClose} />
      </div>
    </div>
  );
});

Header.displayName = 'Header';

export default Header;
