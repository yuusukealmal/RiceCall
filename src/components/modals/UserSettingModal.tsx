/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';

// Types
import type { User } from '@/types';

// Providers
import { useSocket } from '@/providers/SocketProvider';
import { useLanguage } from '@/providers/LanguageProvider';

// Services
import { ipcService } from '@/services/ipc.service';
import { apiService } from '@/services/api.service';

// CSS
import UserSetting from '@/styles/popups/userSetting.module.css';
import grade from '@/styles/common/grade.module.css';

// Utils
import { createDefault } from '@/utils/default';

interface UserSettingModalProps {
  userId: string;
}

const UserSettingModal: React.FC<UserSettingModalProps> = React.memo(
  (initialData: UserSettingModalProps) => {
    // Hooks
    const socket = useSocket();
    const lang = useLanguage();

    // Refs
    const refreshRef = useRef(false);

    // States
    const [userName, setUserName] = useState<User['name']>('');
    const [userGender, setUserGender] = useState<User['gender']>('Male');
    const [userSignature, setUserSignature] = useState<User['signature']>('');
    const [userAvatar, setUserAvatar] = useState<User['avatar']>('');
    const [userLevel, setUserLevel] = useState<User['level']>(0);

    // Variables
    const { userId } = initialData;
    const userGrade = Math.min(56, Math.ceil(userLevel / 5)); // 56 is max level
    const currentYear = new Date().getFullYear();
    const years = Array.from(
      { length: currentYear - 1900 + 1 },
      (_, i) => currentYear - i,
    );
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    // Handlers
    const handleClose = () => {
      ipcService.window.close();
    };

    const handleUpdateUser = () => {
      if (!socket) return;
      socket.send.updateUser({
        user: {
          id: userId,
          name: userName,
          gender: userGender,
          signature: userSignature,
        },
      });
    };

    const handleUserUpdate = (data: User | null) => {
      if (!data) data = createDefault.user();
      setUserName(data.name);
      setUserGender(data.gender);
      setUserSignature(data.signature);
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

    return (
      <>
        <div className={UserSetting['header']}>
          <div className={UserSetting['header-bg']}></div>
        </div>

        <div className={UserSetting['dialog-message-wrapper']}>
          <div className={UserSetting['profile-header-avatar-box']}>
            <div className={UserSetting['profile-header-avatar-border']}></div>
            <div
              className={UserSetting['profile-header-avatar']}
              style={
                userAvatar ? { backgroundImage: `url(${userAvatar})` } : {}
              }
            />
            <div className={UserSetting['profile-header-user-info']}>
              <span className={UserSetting['profile-header-display-name']}>
                {userName}
              </span>
              <div className={UserSetting['profile-header-icons']}>
                <div
                  className={`${UserSetting['userGrade']} ${
                    grade[`lv-${userGrade}`]
                  }`}
                />{' '}
                <span
                  className={UserSetting['profile-header-base-info-weath']}
                ></span>
              </div>
              <span className={UserSetting['profile-header-username']}>
                @{userName}
              </span>
              <div className={UserSetting['profile-header-other-info']}>
                <span className={UserSetting['profile-header-gender']}></span>
                <span className={UserSetting['profile-header-year-old']}>
                  0
                </span>
                <span className={UserSetting['profile-header-country']}>
                  台灣
                </span>
              </div>
            </div>
          </div>
          <div className={UserSetting['profile-tab']}>
            <div
              className={`${UserSetting['profile-me']} ${UserSetting.active}`}
            ></div>
            <div className={UserSetting['profile-groups']}></div>
          </div>
          <div className={UserSetting['profile-form-wrapper']}>
            <div className={UserSetting['profile-form-buttons']}>
              <div
                className={`${UserSetting['profile-form-button']} ${UserSetting.blue}`}
                onClick={() => {
                  handleUpdateUser();
                  handleClose();
                }}
              >
                {lang.tr.confirm}
              </div>
              <div
                className={UserSetting['profile-form-button']}
                onClick={() => handleClose()}
              >
                {lang.tr.cancel}
              </div>
            </div>

            <div className={UserSetting['profile-form-input-wrapper']}>
              <div className={UserSetting['profile-form-row']}>
                <div className={UserSetting['profile-form-group']}>
                  <label
                    className={UserSetting.label}
                    htmlFor="profile-form-nickname"
                  >
                    {lang.tr.nickname}
                  </label>
                  <input
                    className={UserSetting.input}
                    type="text"
                    id="profile-form-nickname"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className={UserSetting['profile-form-group']}>
                  <label
                    className={UserSetting.label}
                    htmlFor="profile-form-gender"
                  >
                    {lang.tr.gender}
                  </label>
                  <div className={UserSetting['select-wrapper']}>
                    <select
                      className={UserSetting.select}
                      id="profile-form-gender"
                      value={userGender}
                      onChange={(e) =>
                        setUserGender(e.target.value as User['gender'])
                      }
                    >
                      <option value="Male">男性</option>
                      <option value="Female">女性</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={UserSetting['profile-form-row']}>
                <div className={UserSetting['profile-form-group']}>
                  <label
                    className={UserSetting.label}
                    htmlFor="profile-form-country"
                  >
                    {lang.tr.country}
                  </label>
                  <div className={UserSetting['select-wrapper']}>
                    <select
                      className={UserSetting.select}
                      id="profile-form-country"
                      // value={userCountry}
                      // onChange={(e) => setUserCountry(e.target.value)}
                    >
                      <option value="台灣">台灣</option>
                    </select>
                  </div>
                </div>
                <div className={UserSetting['profile-form-group']}>
                  <label
                    className={UserSetting.label}
                    htmlFor="profile-form-birthdate"
                  >
                    {lang.tr.birthdate}
                  </label>
                  <div className={UserSetting['profile-form-birthdate-group']}>
                    <div className={UserSetting['select-wrapper']}>
                      <select
                        className={UserSetting.select}
                        id="birthYear"
                        // value={userBirthYear}
                        // onChange={(e) => setUserBirthYear(e.target.value)}
                      >
                        {years.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={UserSetting['select-wrapper']}>
                      <select
                        className={UserSetting.select}
                        id="birthMonth"
                        // value={userBirthMonth}
                        // onChange={(e) => setUserBirthMonth(e.target.value)}
                      >
                        {months.map((month) => (
                          <option key={month} value={month}>
                            {month.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={UserSetting['select-wrapper']}>
                      <select
                        className={UserSetting.select}
                        id="birthDay"
                        // value={userBirthDay}
                        // onChange={(e) => setUserBirthDay(e.target.value)}
                      >
                        {days.map((day) => (
                          <option key={day} value={day}>
                            {day.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className={UserSetting['profile-form-group']}>
                <label
                  className={UserSetting.label}
                  htmlFor="profile-form-signature"
                >
                  {lang.tr.signature}
                </label>
                <input
                  className={UserSetting.input}
                  type="text"
                  id="profile-form-signature"
                  value={userSignature}
                  onChange={(e) => setUserSignature(e.target.value)}
                />
              </div>

              <div className={UserSetting['profile-form-group']}>
                <label
                  className={UserSetting.label}
                  htmlFor="profile-form-about"
                >
                  {lang.tr.about}
                </label>
                <textarea
                  className={UserSetting.textarea}
                  id="profile-form-about"
                  // value={userAbout}
                  // onChange={(e) => setUserAbout(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  },
);

UserSettingModal.displayName = 'UserSettingModal';

export default UserSettingModal;
