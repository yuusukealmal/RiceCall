/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';

import Popup from '../../styles/common/popup.module.css';

const DialogIcon = {
  error: 'error',
  warning: 'warning',
  info: 'info',
};

interface DialogProps {
  iconType: keyof typeof DialogIcon;
  title: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

const Dialog: React.FC<DialogProps> = (initialData: DialogProps) => {
  const { iconType, title } = initialData;
  return (
    <div className={Popup['inputGroup']}>
      <div className={Popup['inputBox']}>
        <div
          className={`${Popup['popupIcon']} ${Popup[DialogIcon[iconType]]}`}
        ></div>
        <div className={Popup['textBorder']}>
          <div className={Popup['title']}>{title}</div>
        </div>
      </div>
    </div>
  );
};

Dialog.displayName = 'Dialog';

export default Dialog;
