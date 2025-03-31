import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// Types
import type { User } from '@/types';

// Providers
import { useSocket } from '@/providers/Socket';
import { useLanguage } from '@/providers/Language';

// Services
import ipcService from '@/services/ipc.service';
import refreshService from '@/services/refresh.service';
import apiService from '@/services/api.service';

// CSS
import grade from '@/styles/common/grade.module.css';
import popup from '@/styles/common/popup.module.css';
import setting from '@/styles/popups/editServer.module.css';
import vip from '@/styles/common/vip.module.css';

// Utils
import { createDefault } from '@/utils/createDefault';

interface UserSettingPopupProps {
  userId: string;
}

const UserSettingPopup: React.FC<UserSettingPopupProps> = React.memo(
  (initialData: UserSettingPopupProps) => {
    // Props
    const socket = useSocket();
    const lang = useLanguage();

    // Refs
    const refreshRef = useRef(false);

    // Date related constants
    const today = useMemo(() => new Date(), []);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // User states
    const [userData, setUserData] = useState<{
      name: User['name'];
      gender: User['gender'];
      signature: User['signature'];
      level: User['level'];
      vip: User['vip'];
      birthYear: User['birthYear'];
      birthMonth: User['birthMonth'];
      birthDay: User['birthDay'];
      country: User['country'];
    }>(() => ({
      name: createDefault.user().name,
      gender: createDefault.user().gender,
      signature: createDefault.user().signature,
      level: createDefault.user().level,
      vip: createDefault.user().vip,
      birthYear: createDefault.user().birthYear,
      birthMonth: createDefault.user().birthMonth,
      birthDay: createDefault.user().birthDay,
      country: createDefault.user().country,
    }));
    const [userAvatar, setUserAvatar] = useState<User['avatar']>(
      createDefault.user().avatar,
    );
    const [userAvatarUrl, setUserAvatarUrl] = useState<User['avatarUrl']>(
      createDefault.user().avatarUrl,
    );

    // Computed values
    const { userId } = initialData;
    const userGrade = Math.min(56, Math.ceil(userData.level / 5));

    const getDaysInMonth = useCallback((year: number, month: number) => {
      return new Date(year, month, 0).getDate();
    }, []);

    const calculateAge = useCallback(
      (birthYear: number, birthMonth: number, birthDay: number) => {
        const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
        let age = today.getFullYear() - birthDate.getFullYear();

        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
          age--;
        }
        return age;
      },
      [today],
    );

    const userAge = useMemo(
      () =>
        calculateAge(
          userData.birthYear,
          userData.birthMonth,
          userData.birthDay,
        ),
      [
        calculateAge,
        userData.birthYear,
        userData.birthMonth,
        userData.birthDay,
      ],
    );

    // Date options
    const years = useMemo(
      () =>
        Array.from(
          { length: currentYear - 1900 + 1 },
          (_, i) => currentYear - i,
        ),
      [currentYear],
    );

    const months = useMemo(
      () => Array.from({ length: 12 }, (_, i) => i + 1),
      [],
    );

    const days = useMemo(
      () =>
        Array.from(
          { length: getDaysInMonth(userData.birthYear, userData.birthMonth) },
          (_, i) => i + 1,
        ),
      [userData.birthYear, userData.birthMonth, getDaysInMonth],
    );

    // Date validation
    const isFutureDate = useCallback(
      (year: number, month: number, day: number) => {
        if (year > currentYear) return true;
        if (year === currentYear && month > currentMonth) return true;
        if (year === currentYear && month === currentMonth && day > currentDay)
          return true;
        return false;
      },
      [currentYear, currentMonth, currentDay],
    );

    // Handlers
    const handleUpdateUser = useCallback(
      (user: Partial<User>) => {
        if (!socket) return;
        socket.send.updateUser({ user, userId });
      },
      [socket, userId],
    );

    const handleUserUpdate = useCallback((data: User | null) => {
      if (!data) data = createDefault.user();
      setUserData({
        name: data.name,
        gender: data.gender,
        signature: data.signature,
        level: data.level,
        vip: data.vip,
        birthYear: data.birthYear,
        birthMonth: data.birthMonth,
        birthDay: data.birthDay,
        country: data.country,
      });
      setUserAvatarUrl(data.avatarUrl);
    }, []);

    // Effects
    useEffect(() => {
      if (!userId || refreshRef.current) return;
      const refresh = async () => {
        refreshRef.current = true;
        Promise.all([
          refreshService.user({
            userId: userId,
          }),
        ]).then(([user]) => {
          handleUserUpdate(user);
        });
      };
      refresh();
    }, [userId, handleUserUpdate]);

    useEffect(() => {
      if (
        isFutureDate(userData.birthYear, userData.birthMonth, userData.birthDay)
      ) {
        setUserData((prev) => ({
          ...prev,
          birthYear: currentYear,
          birthMonth: currentMonth,
          birthDay: currentDay,
        }));
      }
    }, [
      userData.birthYear,
      userData.birthMonth,
      userData.birthDay,
      currentYear,
      currentMonth,
      currentDay,
      isFutureDate,
    ]);

    useEffect(() => {
      const daysInMonth = getDaysInMonth(
        userData.birthYear,
        userData.birthMonth,
      );
      let newDay = userData.birthDay;

      if (newDay > daysInMonth) {
        newDay = daysInMonth;
      }

      if (isFutureDate(userData.birthYear, userData.birthMonth, newDay)) {
        if (
          userData.birthYear === currentYear &&
          userData.birthMonth === currentMonth
        ) {
          newDay = Math.min(newDay, currentDay);
        }
      }

      if (newDay !== userData.birthDay) {
        setUserData((prev) => ({ ...prev, birthDay: newDay }));
      }
    }, [
      userData.birthYear,
      userData.birthMonth,
      userData.birthDay,
      currentYear,
      currentMonth,
      currentDay,
      getDaysInMonth,
      isFutureDate,
    ]);

    const handleClose = () => {
      ipcService.window.close();
    };

    return (
      <div className={`${popup['popupContainer']} ${popup['userProfile']}`}>
        <div className={`${popup['popupBody']} ${popup['col']}`}>
          <div className={popup['header']}>
            <div
              className={popup['avatar']}
              style={{ backgroundImage: `url(${userAvatarUrl})` }}
              onClick={() => {
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (!file) return;

                  const reader = new FileReader();
                  reader.onloadend = async () => {
                    const formData = new FormData();
                    formData.append('_type', 'user');
                    formData.append('_fileName', userAvatar);
                    formData.append('_file', reader.result as string);
                    const data = await apiService.post('/upload', formData);
                    if (data) {
                      setUserAvatar(data.avatar);
                      setUserAvatarUrl(data.avatarUrl);
                    }
                  };
                  reader.readAsDataURL(file);
                };
                fileInput.click();
              }}
            />
            <div
              className={popup['row']}
              style={{ alignItems: 'center', gap: '5px' }}
            >
              <div className={popup['h3']}>{userData.name}</div>
              {userData.vip > 0 && (
                <div
                  className={`${vip['vipIcon']} ${
                    vip[`vip-small-${userData.vip}`]
                  }`}
                />
              )}
              <div
                className={`${grade['grade']} ${grade[`lv-${userGrade}`]}`}
              />
            </div>
            <div
              className={popup['p1']}
              style={{ color: '#fff' }}
              onClick={() => {
                navigator.clipboard.writeText(userId);
              }}
            >
              @{userData.name}
            </div>
            <div className={popup['p1']} style={{ color: '#fff' }}>
              {lang.tr[userData.gender === 'Male' ? 'male' : 'female']} .{' '}
              {userAge} .{lang.tr[userData.country as keyof typeof lang.tr]}
            </div>
            <div className={popup['p1']} style={{ color: '#fff' }}>
              {userData.signature}
            </div>

            <div className={popup['tab']}>
              <div
                className={`${popup['item']} ${popup['about']} ${popup['selected']}`}
              >
                {lang.tr.about}
              </div>
              <div className={`${popup['item']} ${popup['groups']}`}>
                {lang.tr.groups}
              </div>
            </div>
          </div>
          <div className={setting['body']}>
            <div className={popup['col']}>
              <div className={popup['row']}>
                <div className={`${popup['inputBox']} ${popup['col']}`}>
                  <label
                    className={popup['label']}
                    htmlFor="profile-form-nickname"
                  >
                    {lang.tr.nickname}
                  </label>
                  <input
                    type="text"
                    id="profile-form-nickname"
                    value={userData.name}
                    maxLength={32}
                    minLength={2}
                    onChange={(e) =>
                      setUserData((prev) => ({ ...prev, name: e.target.value }))
                    }
                  />
                </div>

                <div className={`${popup['inputBox']} ${popup['col']}`}>
                  <label
                    className={popup['label']}
                    htmlFor="profile-form-gender"
                  >
                    {lang.tr.gender}
                  </label>
                  <div className={popup['selectBox']}>
                    <select
                      value={userData.gender}
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          gender: e.target.value as User['gender'],
                        }))
                      }
                    >
                      <option value="Male">{lang.tr.male}</option>
                      <option value="Female">{lang.tr.female}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className={popup['row']}>
                <div className={`${popup['inputBox']} ${popup['col']}`}>
                  <label
                    className={popup['label']}
                    htmlFor="profile-form-country"
                  >
                    {lang.tr.country}
                  </label>
                  <div className={popup['selectBox']}>
                    <select
                      value={userData.country}
                      onChange={(e) =>
                        setUserData((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                    >
                      <option value="taiwan">{lang.tr.taiwan}</option>
                      <option value="china">{lang.tr.china}</option>
                      <option value="japan">{lang.tr.japan}</option>
                      <option value="korea">{lang.tr.korea}</option>
                      <option value="usa">{lang.tr.usa}</option>
                      <option value="uk">{lang.tr.uk}</option>
                      <option value="france">{lang.tr.france}</option>
                      <option value="germany">{lang.tr.germany}</option>
                      <option value="italy">{lang.tr.italy}</option>
                      <option value="spain">{lang.tr.spain}</option>
                      <option value="portugal">{lang.tr.portugal}</option>
                      <option value="brazil">{lang.tr.brazil}</option>
                      <option value="argentina">{lang.tr.argentina}</option>
                      <option value="mexico">{lang.tr.mexico}</option>
                      <option value="colombia">{lang.tr.colombia}</option>
                      <option value="chile">{lang.tr.chile}</option>
                      <option value="peru">{lang.tr.peru}</option>
                      <option value="venezuela">{lang.tr.venezuela}</option>
                      <option value="bolivia">{lang.tr.bolivia}</option>
                      <option value="ecuador">{lang.tr.ecuador}</option>
                      <option value="paraguay">{lang.tr.paraguay}</option>
                      <option value="uruguay">{lang.tr.uruguay}</option>
                      <option value="nigeria">{lang.tr.nigeria}</option>
                      <option value="southAfrica">{lang.tr.southAfrica}</option>
                      <option value="india">{lang.tr.india}</option>
                      <option value="indonesia">{lang.tr.indonesia}</option>
                      <option value="malaysia">{lang.tr.malaysia}</option>
                      <option value="philippines">{lang.tr.philippines}</option>
                      <option value="thailand">{lang.tr.thailand}</option>
                      <option value="vietnam">{lang.tr.vietnam}</option>
                      <option value="turkey">{lang.tr.turkey}</option>
                      <option value="saudiArabia">{lang.tr.saudiArabia}</option>
                      <option value="qatar">{lang.tr.qatar}</option>
                      <option value="kuwait">{lang.tr.kuwait}</option>
                      <option value="oman">{lang.tr.oman}</option>
                      <option value="bahrain">{lang.tr.bahrain}</option>
                      <option value="algeria">{lang.tr.algeria}</option>
                      <option value="morocco">{lang.tr.morocco}</option>
                      <option value="tunisia">{lang.tr.tunisia}</option>
                      <option value="nigeria">{lang.tr.nigeria}</option>
                    </select>
                  </div>
                </div>
                <div className={`${popup['inputBox']} ${popup['col']}`}>
                  <label
                    className={popup['label']}
                    htmlFor="profile-form-birthdate"
                  >
                    {lang.tr.birthdate}
                  </label>
                  <div className={popup['row']}>
                    <div className={popup['selectBox']}>
                      <select
                        id="birthYear"
                        value={userData.birthYear}
                        onChange={(e) => {
                          const newYear = Number(e.target.value);
                          setUserData((prev) => ({
                            ...prev,
                            birthYear: newYear,
                          }));
                        }}
                      >
                        {years.map((year) => (
                          <option
                            key={year}
                            value={year}
                            disabled={year > currentYear}
                          >
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={popup['selectBox']}>
                      <select
                        className={popup['input']}
                        id="birthMonth"
                        value={userData.birthMonth}
                        onChange={(e) => {
                          const newMonth = Number(e.target.value);
                          setUserData((prev) => ({
                            ...prev,
                            birthMonth: newMonth,
                          }));
                        }}
                      >
                        {months.map((month) => (
                          <option
                            key={month}
                            value={month}
                            disabled={
                              userData.birthYear === currentYear &&
                              month > currentMonth
                            }
                          >
                            {month.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={popup['selectBox']}>
                      <select
                        className={popup['input']}
                        id="birthDay"
                        value={userData.birthDay}
                        onChange={(e) => {
                          const newDay = Number(e.target.value);
                          setUserData((prev) => ({
                            ...prev,
                            birthDay: newDay,
                          }));
                        }}
                      >
                        {days.map((day) => (
                          <option
                            key={day}
                            value={day}
                            disabled={
                              userData.birthYear === currentYear &&
                              userData.birthMonth === currentMonth &&
                              day > currentDay
                            }
                          >
                            {day.toString().padStart(2, '0')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`${popup['inputBox']} ${popup['col']}`}>
                <label
                  className={popup['label']}
                  htmlFor="profile-form-signature"
                >
                  {lang.tr.signature}
                </label>
                <input
                  type="text"
                  id="profile-form-signature"
                  value={userData.signature}
                  maxLength={200}
                  onChange={(e) =>
                    setUserData((prev) => ({
                      ...prev,
                      signature: e.target.value,
                    }))
                  }
                />
              </div>

              <div
                className={`${popup['inputBox']} ${popup['col']} ${popup['disabled']}`}
              >
                <label className={popup['label']} htmlFor="profile-form-about">
                  {lang.tr.about}
                </label>
                <textarea id="profile-form-about" />
              </div>
            </div>
          </div>
        </div>

        <div className={popup['popupFooter']}>
          <div className={popup['button']} onClick={() => handleClose()}>
            {lang.tr.cancel}
          </div>
          <div
            className={`${popup['button']} ${
              !userData.name ||
              userData.name.length < 2 ||
              !userData.gender ||
              !userData.country ||
              !userData.birthYear ||
              !userData.birthMonth ||
              !userData.birthDay
                ? popup['disabled']
                : ''
            }`}
            onClick={() => {
              handleUpdateUser({
                ...userData,
                avatar: userAvatar,
                avatarUrl: userAvatarUrl,
              });
              handleClose();
            }}
          >
            {lang.tr.confirm}
          </div>
        </div>
      </div>
    );
  },
);

UserSettingPopup.displayName = 'UserSettingPopup';

export default UserSettingPopup;
