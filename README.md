# RiceCall

這是 RaidCall 的非官方復刻版 RiceCall，目前尚處於開發階段，若有興趣歡迎於 Discord 一同參與討論

### ->[Discord 群組](https://discord.gg/adCWzv6wwS)<-

![image](https://github.com/user-attachments/assets/e9676ed9-8543-455e-8dda-3c74b56f538f)
![image](https://github.com/user-attachments/assets/14aa056c-4e81-4545-a2d9-21a5aa2db2be)
![image](https://github.com/user-attachments/assets/2ffb2c7a-f76b-43b0-9608-d807563c490b)
![image](https://github.com/user-attachments/assets/05c34459-1198-46e2-8e8a-6049945c6e70)
![image](https://github.com/user-attachments/assets/19441cd9-fb17-4c65-806e-01051b4da04c)

## 使用方法

若是想參與測試開發版本，此 repo 的 branch 分別為：

| branch        | role                 |
| ------------- | -------------------- |
| [main](https://github.com/NerdyHomeReOpen/RiceCall) | client / test-server |
| [backend](https://github.com/NerdyHomeReOpen/RiceCall/tree/Websocket)   | server               |

## 如何啟動

### 1. 安裝 Modules

```bash
# 使用 npm
npm install

# 或使用 yarn (推薦)
yarn install
```

### 2. 啟動 Client

```bash
# 使用 npm
npm run electron-dev

# 或使用 yarn (推薦)
yarn electron-dev
```

### 3. 啟動 Test-Server (前端開發用)

```bash
node /test-server/index.js
```

### 4. 建置 Database

```bash
node /test-server/initial.js
```

客戶端及伺服器即會運行於本地電腦上

> [客戶端](localhost:3000) (localhost:3000)
>
> [伺服器端](localhost:4500) (localhost:4500)

## 免責聲明

**RiceCall** 是一個**獨立開發**的專案，與 RaidCall 的原開發團隊、伺服器或任何官方組織 **沒有任何關聯**。本專案**並非** RaidCall 的延續或官方授權版本，亦**不涉及恢復過去的 RaidCall 服務或其伺服器**。

RiceCall 的開發純屬愛好者社群的自主行動，目的在於提供一個新的語音交流平台，並非商業化項目。本專案可能會參考或取用部分 RaidCall 相關的素材，但所有內容皆屬我們的獨立創作，且不代表 RaidCall 官方立場或意圖。

如有任何與 RaidCall 相關的問題，請直接聯繫其原開發團隊或官方渠道。**RiceCall 不負責與 RaidCall 相關的任何技術支援**、帳號恢復或資料遺失等問題。

本專案完全獨立開發，所有內容僅供學術研究與技術交流使用。如涉及任何版權、商標或其他權利問題，請聯繫我們進行溝通。
