const fs = require('fs');
const { QuickDB } = require('quick.db');
const db = new QuickDB();

const extractXpInfo = async () => {
  const users = await db.get('users');
  for (const user of Object.values(users)) {
    fs.appendFileSync(
      'xpInfo.txt',
      JSON.stringify(
        {
          id: user.id,
          level: user.level,
          xp: user.xp,
          requiredXp: user.requiredXp,
          progress: user.progress,
        },
        null,
        2,
      ) + '\n', // 加上換行符號
      'utf-8', // 指定編碼格式
    );
  }

  console.log('Done');
};

extractXpInfo();
