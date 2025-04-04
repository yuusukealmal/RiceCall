const { QuickDB } = require('quick.db');
const db = new QuickDB();
const { XP_SYSTEM } = require('./constant.js');
const Set = require('./utils/set.js');

function totalXP(level, baseXP = 5, growthRate = 1.02) {
  if (level < 1) return 0;
  let totalXP = 0;
  for (let i = 1; i <= level; i++) {
    totalXP += Math.ceil(baseXP * Math.pow(growthRate, i));
  }
  return totalXP;
}

function getRequiredXP(level) {
  return Math.ceil(
    XP_SYSTEM.BASE_REQUIRE_XP * Math.pow(XP_SYSTEM.GROWTH_RATE, level),
  );
}

const reCalculate = async () => {
  const users = await db.get('users');
  for (const user of Object.values(users)) {
    let totalXp = totalXP(user.level) + user.xp;
    let level = 1;
    let requiredXp = 0;
    while (true) {
      requiredXp = getRequiredXP(level);
      if (totalXp < requiredXp) break;
      level += 1;
      totalXp -= requiredXp;
    }
    await Set.user(user.id, {
      level: level,
      xp: totalXp,
      requiredXp: requiredXp,
      progress: totalXp / requiredXp,
    });
    console.log(
      `Update ${
        user.id
      } level to ${level}, xp to ${totalXp}, requiredXp to ${requiredXp}, progress to ${
        totalXp / requiredXp
      }`,
    );
  }
};

reCalculate();
