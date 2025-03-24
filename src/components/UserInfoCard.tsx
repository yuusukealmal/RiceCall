import React from 'react';

// CSS
import userInfoCard from '@/styles/userInfoCard.module.css';
import grade from '@/styles/common/grade.module.css';
import vip from '@/styles/common/vip.module.css';
import permission from '@/styles/common/permission.module.css';

// Components
import BadgeViewer from '@/components/viewers/BadgeViewer';

// Types
import type { ServerMember } from '@/types';

// Providers
import { useLanguage } from '@/providers/LanguageProvider';

interface UserInfoCardProps {
  x: number;
  y: number;
  member: ServerMember;
}

const UserInfoCard: React.FC<UserInfoCardProps> = React.memo(
  ({ x, y, member }) => {
    // Language
    const lang = useLanguage();

    const {
      name: memberName,
      avatar: memberAvatar,
      gender: memberGender,
      level: memberLevel,
      // xp: memberXp,
      progress: memberXpProgress,
      requiredXp: memberRequiredXp,
      badges: memberBadges = [],
      permissionLevel: memberPermission,
      contribution: memberContributions,
      nickname: memberNickname,
    } = member;
    const memberGrade = Math.min(56, Math.ceil(memberLevel / 5));
    const memberVip = 1;

    return (
      <div
        className={`${userInfoCard['userInfoCard']} ${
          userInfoCard[`vip-${memberVip}`]
        }`}
        style={{ top: y, left: x }}
      >
        <div className={userInfoCard['body']}>
          <div className={userInfoCard['top']}>
            {/* Left Avatar */}
            <div
              className={userInfoCard['avatarPicture']}
              style={{ backgroundImage: `url(${memberAvatar})` }}
            />
            {/* Right Info */}
            <div className={userInfoCard['userInfoWrapper']}>
              <div className={userInfoCard['name']}>
                {memberNickname || memberName}
              </div>
              <div className={`${userInfoCard['iconBox']}`}>
                <div
                  className={`${grade['grade']} ${grade[`lv-${memberGrade}`]}`}
                />
                <div
                  className={`${vip['vipIconBig']} ${
                    vip[`vip-big-${memberVip}`]
                  }`}
                />
              </div>
              {/* VIP Info Text */}
              {memberVip > 0 && (
                <div className={userInfoCard['vipText']}>
                  (會員{memberVip}倍升級加速中)
                </div>
              )}
              {/* Xp Section */}
              <div className={userInfoCard['xpWrapper']}>
                {/** Show Xp Progress */}
                <div className={userInfoCard['xpBox']}>
                  <div
                    className={userInfoCard['xpProgress']}
                    style={{
                      width: `${memberXpProgress * 100}%`,
                    }}
                  />
                </div>
                {/** Xp Text */}
                <div className={userInfoCard['xpText']}>
                  <div>0</div>
                  {/* <div
                      style={{
                        position: 'absolute',
                        left: `${memberXpProgress * 100}%`,
                        transform: 'translateX(-50%) scale(0.8)',
                        bottom: '-25px',
                      }}
                      className="flex flex-col items-center"
                    >
                      <ArrowUp size={12} className="text-blue-500" />
                      <span>{memberXp}</span>
                    </div> */}
                  <div>{memberRequiredXp}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className={userInfoCard['bottom']}>
            <div
              className={`${permission[memberGender]} ${
                permission[`lv-${memberPermission}`]
              }`}
            ></div>
            <div className={userInfoCard['permissionText']}>
              {lang.getPermissionText(memberPermission)}
            </div>
            <div className={userInfoCard['saperator']} />
            <div className={userInfoCard['contributionBox']}>
              <div className={userInfoCard['contributionText']}>
                {lang.tr.contribution}:
              </div>
              <div className={userInfoCard['contributionValue']}>
                {memberContributions}
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className={userInfoCard['footer']}>
          <BadgeViewer badges={memberBadges} maxDisplay={13} />
        </div>
      </div>
    );
  },
);

UserInfoCard.displayName = 'UserInfoCard';

export default UserInfoCard;
