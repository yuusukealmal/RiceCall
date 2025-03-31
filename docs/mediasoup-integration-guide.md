# MediaSoup 前後端整合指南

本文檔提供了如何將前端 mediasoup-client 與 RiceCall SFU 後端進行整合的詳細說明，以實現多人實時語音通話功能。

## 目錄

- [技術架構概述](#技術架構概述)
- [前端安裝與配置](#前端安裝與配置)
- [通信流程](#通信流程)
- [事件列表](#事件列表)
- [前端實現示例](#前端實現示例)
- [錯誤處理](#錯誤處理)
- [常見問題](#常見問題)

## 技術架構概述

RiceCall 使用以下技術實現 SFU (Selective Forwarding Unit) 架構的語音通話系統：

- **後端**：Node.js + MediaSoup + Socket.IO
- **前端**：mediasoup-client + Socket.IO-client

SFU 架構相比 P2P 架構具有以下優勢：
- 更好的可擴展性，支持更多用戶同時在線
- 減少用戶端頻寬和 CPU 使用
- 更穩定的連接品質

## 前端安裝與配置

### 安裝必要依賴

```bash
npm install mediasoup-client socket.io-client
```

### 基本配置

```javascript
// 引入庫
import * as mediasoupClient from 'mediasoup-client';
import io from 'socket.io-client';

// 連接 socket.io
const socket = io('https://your-server-url', {
  path: '/socket',
  transports: ['websocket'],
  // 添加認證信息（根據您的系統需求）
  auth: {
    token: 'your-token',
  },
});
```

## 通信流程

前後端通信流程如下：

1. **建立連接**：前端透過 Socket.IO 連接到服務器
2. **加入頻道**：客戶端發送 `joinRTCChannel` 事件加入特定頻道
3. **獲取 Router 能力**：服務器回傳 Router RTP 能力配置
4. **加載設備**：前端利用 Router 能力加載 mediasoup Device
5. **創建傳輸**：通過 `offer` 事件建立 WebRTC 傳輸
6. **創建生產者**：發送本地音頻流
7. **消費者訂閱**：通過 `answer` 事件獲取並播放其他用戶的音頻
8. **離開頻道**：發送 `leaveRTCChannel` 事件清理資源

## 事件列表

### 客戶端發送的事件

| 事件名稱 | 參數 | 描述 |
|----------|------|------|
| `joinRTCChannel` | `{ channelId }` | 加入指定的語音頻道 |
| `offer` | `{ channelId, dtlsParameters, rtpParameters? }` | 建立 WebRTC 連接和創建音頻生產者 |
| `answer` | `{ channelId, producerId, rtpCapabilities, dtlsParameters }` | 訂閱其他用戶的音頻流 |
| `leaveRTCChannel` | `{ channelId }` | 離開語音頻道，釋放資源 |

### 服務器發送的事件

| 事件名稱 | 參數 | 描述 |
|----------|------|------|
| `RTCRouterRtpCapabilities` | `{ rtpCapabilities }` | 返回 Router 的 RTP 能力 |
| `RTCExistingProducers` | 生產者列表 | 頻道內現有用戶的音頻生產者列表 |
| `RTCProducerCreated` | `{ id, producerId, socketId, kind }` | 有新用戶加入並創建了音頻生產者 |
| `RTCLeave` | `{ socketId, producerIds, reason? }` | 用戶離開頻道通知 |
| `error` | 錯誤對象 | 發生錯誤時的通知 |

## 前端實現示例

以下是實現前端 mediasoup-client 與後端交互的主要代碼示例：

```javascript
const RiceCallRTC = {
  // 變量初始化
  socket: null,
  device: null,
  transport: null,
  producer: null,
  consumers: new Map(), // 存儲消費者，鍵為 producerId
  channelId: null,
  
  // 初始化連接
  async init(socket, channelId) {
    this.socket = socket;
    this.channelId = channelId;
    this.device = new mediasoupClient.Device();
    
    // 設置事件監聽
    this._setupEventListeners();
    
    // 加入頻道
    return this.joinChannel(channelId);
  },
  
  // 設置 Socket.IO 事件監聽
  _setupEventListeners() {
    this.socket.on('RTCRouterRtpCapabilities', async (data) => {
      try {
        // 使用路由器 RTP 能力加載設備
        await this.device.load({ routerRtpCapabilities: data.rtpCapabilities });
        
        // 創建傳輸並發送本地音頻
        await this._createSendTransport();
      } catch (error) {
        console.error('加載 mediasoup 設備失敗', error);
      }
    });
    
    this.socket.on('RTCExistingProducers', async (producers) => {
      // 訂閱現有用戶的音頻
      for (const producer of producers) {
        await this._subscribeToProducer(producer);
      }
    });
    
    this.socket.on('RTCProducerCreated', async (data) => {
      // 訂閱新加入用戶的音頻
      await this._subscribeToProducer(data);
    });
    
    this.socket.on('RTCLeave', (data) => {
      // 關閉離開用戶的音頻消費者
      if (data.producerIds) {
        for (const producerId of data.producerIds) {
          if (this.consumers.has(producerId)) {
            this.consumers.get(producerId).close();
            this.consumers.delete(producerId);
          }
        }
      }
    });
    
    this.socket.on('error', (error) => {
      console.error('RTC 錯誤:', error);
    });
  },
  
  // 加入頻道
  joinChannel(channelId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('joinRTCChannel', { channelId }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || '加入頻道失敗'));
        }
      });
    });
  },
  
  // 創建發送傳輸
  async _createSendTransport() {
    try {
      // 創建傳輸用於發送音頻
      const transportOptions = {
        sctpParameters: this.device.sctpCapabilities,
      };
      
      this.transport = this.device.createSendTransport(transportOptions);
      
      // 設置傳輸事件處理
      this.transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          // 發送 offer 以建立連接
          this.socket.emit('offer', {
            channelId: this.channelId,
            dtlsParameters,
          }, (response) => {
            if (response.success) {
              callback();
            } else {
              errback(new Error(response.error || '連接失敗'));
            }
          });
        } catch (error) {
          errback(error);
        }
      });
      
      this.transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          this.socket.emit('offer', {
            channelId: this.channelId,
            rtpParameters,
          }, (response) => {
            if (response.success && response.producerId) {
              callback({ id: response.producerId });
            } else {
              errback(new Error(response.error || '生產失敗'));
            }
          });
        } catch (error) {
          errback(error);
        }
      });
      
      // 發送本地音頻
      await this._publishLocalAudio();
    } catch (error) {
      console.error('創建發送傳輸失敗', error);
    }
  },
  
  // 發布本地音頻
  async _publishLocalAudio() {
    try {
      // 獲取麥克風音頻流
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      
      // 創建生產者
      this.producer = await this.transport.produce({
        track,
        codecOptions: {
          opusStereo: true,
          opusDtx: true,
        }
      });
      
      return this.producer;
    } catch (error) {
      console.error('發布本地音頻失敗', error);
      throw error;
    }
  },
  
  // 訂閱遠程用戶的音頻
  async _subscribeToProducer(producer) {
    try {
      // 確保設備已加載且可以接收此類媒體
      if (!this.device.loaded || !this.device.canConsume({
        producerId: producer.producerId,
        kind: producer.kind,
      })) {
        return;
      }
      
      // 發送 answer 請求訂閱
      this.socket.emit('answer', {
        channelId: this.channelId,
        producerId: producer.producerId,
        rtpCapabilities: this.device.rtpCapabilities,
        dtlsParameters: {} // 這會在回調中自動填充
      }, async (response) => {
        if (!response.success) {
          console.error('訂閱生產者失敗', response.error);
          return;
        }
        
        // 創建消費者
        const consumer = await this.transport.consume({
          id: response.consumerId,
          producerId: producer.producerId,
          kind: producer.kind,
          rtpParameters: response.rtpParameters,
        });
        
        // 存儲消費者
        this.consumers.set(producer.producerId, consumer);
        
        // 創建音頻元素播放聲音
        const audioElement = new Audio();
        audioElement.srcObject = new MediaStream([consumer.track]);
        audioElement.autoplay = true;
        
        // 可選：添加音頻元素到 DOM
        document.body.appendChild(audioElement);
      });
    } catch (error) {
      console.error('訂閱生產者失敗', error);
    }
  },
  
  // 離開頻道
  leaveChannel() {
    return new Promise((resolve) => {
      // 關閉所有消費者
      for (const consumer of this.consumers.values()) {
        consumer.close();
      }
      this.consumers.clear();
      
      // 關閉生產者
      if (this.producer) {
        this.producer.close();
        this.producer = null;
      }
      
      // 關閉傳輸
      if (this.transport) {
        this.transport.close();
        this.transport = null;
      }
      
      // 發送離開請求
      this.socket.emit('leaveRTCChannel', { channelId: this.channelId }, (response) => {
        resolve(response);
      });
      
      this.device = null;
    });
  }
};

// 使用示例
(async () => {
  // 連接 Socket.IO
  const socket = io('https://your-server-url', { /* 配置 */ });
  
  // 初始化 RTC
  await RiceCallRTC.init(socket, 'channel-123');
  
  // ... 用戶使用語音聊天
  
  // 離開頻道
  await RiceCallRTC.leaveChannel();
})();
```

## 錯誤處理

後端使用標準化的錯誤對象，格式如下：

```javascript
{
  error_message: String, // 錯誤描述
  error_type: String,    // 錯誤類型
  error_source: String,  // 錯誤來源
  error_code: String,    // 錯誤代碼
  status_code: Number    // HTTP 狀態碼
}
```

前端應該準備處理以下常見錯誤：

| 錯誤代碼 | 描述 | 處理建議 |
|---------|------|---------|
| `DATA_INVALID` | 發送的數據無效 | 檢查參數格式和必填項 |
| `USER_NOT_AUTHENTICATED` | 用戶未經認證 | 重新登錄或刷新認證令牌 |
| `TRANSPORT_ERROR` | 傳輸創建或連接失敗 | 檢查網絡連接，可能需要重試 |
| `PRODUCER_ERROR` | 創建生產者失敗 | 檢查音頻來源和設備權限 |
| `CONSUMER_ERROR` | 創建消費者失敗 | 確認訂閱的生產者存在且有效 |
| `DTLS_ERROR` | DTLS 連接失敗 | 檢查防火牆設置或網絡限制 |
| `ICE_ERROR` | ICE 連接失敗 | 檢查 NAT 穿透設置和網絡限制 |

## 常見問題

### 1. 無法聽到其他用戶的聲音

可能原因：
- 瀏覽器未授權麥克風訪問
- 消費者未正確創建
- 音頻元素未添加到 DOM 或未自動播放

解決方案：
- 確保已獲得麥克風權限
- 檢查消費者訂閱流程
- 確保音頻元素設置了 autoplay=true

### 2. 連接經常斷開

可能原因：
- 網絡不穩定
- 服務器資源不足
- DTLS/ICE 配置問題

解決方案：
- 實現自動重連機制
- 優化網絡環境
- 檢查 STUN/TURN 服務器配置

### 3. 延遲過高

可能原因：
- 網絡延遲
- 服務器負載過高
- 音頻編碼問題

解決方案：
- 優化網絡環境
- 調整音頻編碼參數
- 考慮使用更低延遲的編碼

### 4. CPU 使用率過高

可能原因：
- 同時訂閱過多的用戶
- 音頻處理開銷大

解決方案：
- 實現自動靜音不活躍的用戶
- 優化音頻處理參數
- 為大型會議實現更智能的訂閱機制
