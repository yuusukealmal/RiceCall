/* eslint-disable @typescript-eslint/no-require-imports */
const mediasoup = require('mediasoup');
const config = require('./config');
const { v4: uuidv4 } = require('uuid');

// Utils
const utils = require('../utils');
const {
  standardizedError: StandardizedError,
  logger: Logger,
} = utils;

class SfuManager {
  constructor() {
    this.workers = [];
    this.nextWorkerIndex = 0;
    this.rooms = new Map(); // channelId -> room
    this.peers = new Map(); // socketId -> peer
    this.transports = new Map(); // transportId -> transport
    this.producers = new Map(); // producerId -> producer
    this.consumers = new Map(); // consumerId -> consumer
    this.channelPeers = new Map(); // channelId -> Set(socketId)
  }

  async initialize() {
    try {
      // 創建 mediasoup 工作者
      const { numWorkers = 1 } = config.worker;
      const workersCount = Math.min(numWorkers, Object.keys(require('os').cpus()).length);
      
      const promises = [];
      for (let i = 0; i < workersCount; i++) {
        promises.push(this.createWorker());
      }
      
      this.workers = await Promise.all(promises);
      new Logger('SFU').success(`已創建 ${this.workers.length} 個 mediasoup 工作者`);
      
      return true;
    } catch (error) {
      new Logger('SFU').error(`初始化 SFU 失敗: ${error.message}`);
      return false;
    }
  }

  async createWorker() {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      logTags: config.worker.logTags,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      new Logger('SFU').error(`mediasoup 工作者意外關閉，pid: ${worker.pid}`);
      // 嘗試重新創建工作者
      this.createWorker().then((newWorker) => {
        const index = this.workers.findIndex((w) => w.pid === worker.pid);
        if (index !== -1) {
          this.workers[index] = newWorker;
        } else {
          this.workers.push(newWorker);
        }
      });
    });

    return worker;
  }

  getNextWorker() {
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }

  async createRoom(channelId) {
    if (this.rooms.has(channelId)) {
      return this.rooms.get(channelId);
    }

    try {
      const worker = this.getNextWorker();
      const router = await worker.createRouter({ mediaCodecs: config.router.mediaCodecs });
      
      const room = {
        id: channelId,
        router,
        peers: new Set(),
        createdAt: Date.now(),
      };
      
      this.rooms.set(channelId, room);
      this.channelPeers.set(channelId, new Set());
      
      new Logger('SFU').success(`為頻道 ${channelId} 創建了新的房間`);
      return room;
    } catch (error) {
      new Logger('SFU').error(`創建房間失敗: ${error.message}`);
      throw new StandardizedError(
        `創建 SFU 房間失敗: ${error.message}`,
        'ServerError',
        'CREATESFUROOM',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async getOrCreateRoom(channelId) {
    if (this.rooms.has(channelId)) {
      return this.rooms.get(channelId);
    }
    return this.createRoom(channelId);
  }

  async createPeer(socketId, userId, channelId) {
    if (this.peers.has(socketId)) {
      return this.peers.get(socketId);
    }

    const room = await this.getOrCreateRoom(channelId);
    
    const peer = {
      id: socketId,
      userId,
      channelId,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map(),
      rtpCapabilities: null,
    };
    
    this.peers.set(socketId, peer);
    room.peers.add(socketId);
    
    // 將 peer 添加到頻道 peers 集合中
    const channelPeers = this.channelPeers.get(channelId) || new Set();
    channelPeers.add(socketId);
    this.channelPeers.set(channelId, channelPeers);
    
    new Logger('SFU').success(`用戶 ${userId} (${socketId}) 加入了頻道 ${channelId} 的 SFU 房間`);
    return peer;
  }

  async removePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (!peer) return;

    // 關閉所有 transport
    for (const transport of peer.transports.values()) {
      transport.close();
      this.transports.delete(transport.id);
    }

    // 關閉所有 producer
    for (const producer of peer.producers.values()) {
      producer.close();
      this.producers.delete(producer.id);
    }

    // 關閉所有 consumer
    for (const consumer of peer.consumers.values()) {
      consumer.close();
      this.consumers.delete(consumer.id);
    }

    // 從房間中移除 peer
    const room = this.rooms.get(peer.channelId);
    if (room) {
      room.peers.delete(socketId);
      
      // 如果房間為空，考慮關閉房間
      if (room.peers.size === 0) {
        // 可以選擇保留房間一段時間再關閉，或立即關閉
        // this.rooms.delete(peer.channelId);
        // new Logger('SFU').info(`頻道 ${peer.channelId} 的 SFU 房間已關閉 (無用戶)`);
      }
    }

    // 從頻道 peers 集合中移除
    const channelPeers = this.channelPeers.get(peer.channelId);
    if (channelPeers) {
      channelPeers.delete(socketId);
      if (channelPeers.size === 0) {
        this.channelPeers.delete(peer.channelId);
      }
    }

    // 從 peers 映射中移除
    this.peers.delete(socketId);
    
    new Logger('SFU').success(`用戶 ${peer.userId} (${socketId}) 已離開 SFU 房間`);
  }

  async createWebRtcTransport(socketId, direction) {
    const peer = this.peers.get(socketId);
    if (!peer) {
      throw new StandardizedError(
        '找不到用戶',
        'ValidationError',
        'CREATEWEBRTCTRANSPORT',
        'PEER_NOT_FOUND',
        404,
      );
    }

    const room = this.rooms.get(peer.channelId);
    if (!room) {
      throw new StandardizedError(
        '找不到房間',
        'ValidationError',
        'CREATEWEBRTCTRANSPORT',
        'ROOM_NOT_FOUND',
        404,
      );
    }

    try {
      const transport = await room.router.createWebRtcTransport({
        listenIps: config.webRtcTransport.listenIps,
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: config.webRtcTransport.initialAvailableOutgoingBitrate,
        minimumAvailableOutgoingBitrate: config.webRtcTransport.minimumAvailableOutgoingBitrate,
      });

      // 監聽 transport 事件
      transport.on('dtlsstatechange', (dtlsState) => {
        if (dtlsState === 'closed') {
          transport.close();
        }
      });

      transport.on('close', () => {
        new Logger('SFU').info(`Transport ${transport.id} 已關閉`);
        this.transports.delete(transport.id);
        peer.transports.delete(transport.id);
      });

      // 保存 transport
      this.transports.set(transport.id, transport);
      peer.transports.set(transport.id, transport);

      return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        direction,
      };
    } catch (error) {
      new Logger('SFU').error(`創建 WebRTC Transport 失敗: ${error.message}`);
      throw new StandardizedError(
        `創建 WebRTC Transport 失敗: ${error.message}`,
        'ServerError',
        'CREATEWEBRTCTRANSPORT',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async connectTransport(transportId, dtlsParameters) {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new StandardizedError(
        '找不到 Transport',
        'ValidationError',
        'CONNECTTRANSPORT',
        'TRANSPORT_NOT_FOUND',
        404,
      );
    }

    try {
      await transport.connect({ dtlsParameters });
      new Logger('SFU').success(`Transport ${transportId} 已連接`);
      return true;
    } catch (error) {
      new Logger('SFU').error(`連接 Transport 失敗: ${error.message}`);
      throw new StandardizedError(
        `連接 Transport 失敗: ${error.message}`,
        'ServerError',
        'CONNECTTRANSPORT',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async produce(socketId, transportId, kind, rtpParameters, appData = {}) {
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new StandardizedError(
        '找不到 Transport',
        'ValidationError',
        'PRODUCE',
        'TRANSPORT_NOT_FOUND',
        404,
      );
    }

    const peer = this.peers.get(socketId);
    if (!peer) {
      throw new StandardizedError(
        '找不到用戶',
        'ValidationError',
        'PRODUCE',
        'PEER_NOT_FOUND',
        404,
      );
    }

    try {
      const producer = await transport.produce({
        kind,
        rtpParameters,
        appData: { ...appData, peerId: socketId, peerUserId: peer.userId },
      });

      // 監聽 producer 事件
      producer.on('transportclose', () => {
        producer.close();
        this.producers.delete(producer.id);
        peer.producers.delete(producer.id);
      });

      producer.on('close', () => {
        new Logger('SFU').info(`Producer ${producer.id} 已關閉`);
        this.producers.delete(producer.id);
        peer.producers.delete(producer.id);
      });

      // 保存 producer
      this.producers.set(producer.id, producer);
      peer.producers.set(producer.id, producer);

      new Logger('SFU').success(`用戶 ${peer.userId} 創建了 ${kind} Producer ${producer.id}`);
      return producer.id;
    } catch (error) {
      new Logger('SFU').error(`創建 Producer 失敗: ${error.message}`);
      throw new StandardizedError(
        `創建 Producer 失敗: ${error.message}`,
        'ServerError',
        'PRODUCE',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async consume(socketId, producerId, rtpCapabilities) {
    const peer = this.peers.get(socketId);
    if (!peer) {
      throw new StandardizedError(
        '找不到用戶',
        'ValidationError',
        'CONSUME',
        'PEER_NOT_FOUND',
        404,
      );
    }

    const producer = this.producers.get(producerId);
    if (!producer) {
      throw new StandardizedError(
        '找不到 Producer',
        'ValidationError',
        'CONSUME',
        'PRODUCER_NOT_FOUND',
        404,
      );
    }

    const room = this.rooms.get(peer.channelId);
    if (!room) {
      throw new StandardizedError(
        '找不到房間',
        'ValidationError',
        'CONSUME',
        'ROOM_NOT_FOUND',
        404,
      );
    }

    // 檢查路由器是否可以消費
    if (!room.router.canConsume({
      producerId: producer.id,
      rtpCapabilities,
    })) {
      throw new StandardizedError(
        '路由器無法消費此 Producer',
        'ValidationError',
        'CONSUME',
        'CANNOT_CONSUME',
        400,
      );
    }

    try {
      // 獲取接收傳輸
      let transport;
      for (const t of peer.transports.values()) {
        if (t.appData && t.appData.direction === 'recv') {
          transport = t;
          break;
        }
      }

      if (!transport) {
        throw new StandardizedError(
          '找不到接收傳輸',
          'ValidationError',
          'CONSUME',
          'RECV_TRANSPORT_NOT_FOUND',
          404,
        );
      }

      // 創建消費者
      const consumer = await transport.consume({
        producerId: producer.id,
        rtpCapabilities,
        paused: true, // 初始暫停，等待客戶端準備好
      });

      // 監聽消費者事件
      consumer.on('transportclose', () => {
        consumer.close();
        this.consumers.delete(consumer.id);
        peer.consumers.delete(consumer.id);
      });

      consumer.on('producerclose', () => {
        consumer.close();
        this.consumers.delete(consumer.id);
        peer.consumers.delete(consumer.id);
      });

      consumer.on('close', () => {
        new Logger('SFU').info(`Consumer ${consumer.id} 已關閉`);
        this.consumers.delete(consumer.id);
        peer.consumers.delete(consumer.id);
      });

      // 保存消費者
      this.consumers.set(consumer.id, consumer);
      peer.consumers.set(consumer.id, consumer);

      return {
        id: consumer.id,
        producerId: producer.id,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        producerUserId: producer.appData.peerUserId,
      };
    } catch (error) {
      new Logger('SFU').error(`創建 Consumer 失敗: ${error.message}`);
      throw new StandardizedError(
        `創建 Consumer 失敗: ${error.message}`,
        'ServerError',
        'CONSUME',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async resumeConsumer(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new StandardizedError(
        '找不到 Consumer',
        'ValidationError',
        'RESUMECONSUMER',
        'CONSUMER_NOT_FOUND',
        404,
      );
    }

    try {
      await consumer.resume();
      new Logger('SFU').success(`Consumer ${consumerId} 已恢復`);
      return true;
    } catch (error) {
      new Logger('SFU').error(`恢復 Consumer 失敗: ${error.message}`);
      throw new StandardizedError(
        `恢復 Consumer 失敗: ${error.message}`,
        'ServerError',
        'RESUMECONSUMER',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async pauseConsumer(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new StandardizedError(
        '找不到 Consumer',
        'ValidationError',
        'PAUSECONSUMER',
        'CONSUMER_NOT_FOUND',
        404,
      );
    }

    try {
      await consumer.pause();
      new Logger('SFU').success(`Consumer ${consumerId} 已暫停`);
      return true;
    } catch (error) {
      new Logger('SFU').error(`暫停 Consumer 失敗: ${error.message}`);
      throw new StandardizedError(
        `暫停 Consumer 失敗: ${error.message}`,
        'ServerError',
        'PAUSECONSUMER',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async closeProducer(producerId) {
    const producer = this.producers.get(producerId);
    if (!producer) {
      throw new StandardizedError(
        '找不到 Producer',
        'ValidationError',
        'CLOSEPRODUCER',
        'PRODUCER_NOT_FOUND',
        404,
      );
    }

    try {
      producer.close();
      new Logger('SFU').success(`Producer ${producerId} 已關閉`);
      return true;
    } catch (error) {
      new Logger('SFU').error(`關閉 Producer 失敗: ${error.message}`);
      throw new StandardizedError(
        `關閉 Producer 失敗: ${error.message}`,
        'ServerError',
        'CLOSEPRODUCER',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  async getProducersInChannel(channelId) {
    const room = this.rooms.get(channelId);
    if (!room) return [];

    const producers = [];
    for (const peerId of room.peers) {
      const peer = this.peers.get(peerId);
      if (!peer) continue;

      for (const producer of peer.producers.values()) {
        producers.push({
          id: producer.id,
          kind: producer.kind,
          userId: peer.userId,
        });
      }
    }

    return producers;
  }

  async changeChannel(socketId, newChannelId) {
    const peer = this.peers.get(socketId);
    if (!peer) {
      throw new StandardizedError(
        '找不到用戶',
        'ValidationError',
        'CHANGECHANNEL',
        'PEER_NOT_FOUND',
        404,
      );
    }

    const oldChannelId = peer.channelId;
    if (oldChannelId === newChannelId) return;

    try {
      // 從舊頻道中移除
      const oldRoom = this.rooms.get(oldChannelId);
      if (oldRoom) {
        oldRoom.peers.delete(socketId);
      }

      const oldChannelPeers = this.channelPeers.get(oldChannelId);
      if (oldChannelPeers) {
        oldChannelPeers.delete(socketId);
        if (oldChannelPeers.size === 0) {
          this.channelPeers.delete(oldChannelId);
        }
      }

      // 關閉所有 producer 和 consumer
      for (const producer of peer.producers.values()) {
        producer.close();
        this.producers.delete(producer.id);
      }
      peer.producers.clear();

      for (const consumer of peer.consumers.values()) {
        consumer.close();
        this.consumers.delete(consumer.id);
      }
      peer.consumers.clear();

      // 加入新頻道
      const newRoom = await this.getOrCreateRoom(newChannelId);
      newRoom.peers.add(socketId);

      const newChannelPeers = this.channelPeers.get(newChannelId) || new Set();
      newChannelPeers.add(socketId);
      this.channelPeers.set(newChannelId, newChannelPeers);

      // 更新 peer 信息
      peer.channelId = newChannelId;

      new Logger('SFU').success(`用戶 ${peer.userId} (${socketId}) 從頻道 ${oldChannelId} 切換到頻道 ${newChannelId}`);
      return true;
    } catch (error) {
      new Logger('SFU').error(`切換頻道失敗: ${error.message}`);
      throw new StandardizedError(
        `切換頻道失敗: ${error.message}`,
        'ServerError',
        'CHANGECHANNEL',
        'EXCEPTION_ERROR',
        500,
      );
    }
  }

  getRtpCapabilities(channelId) {
    const room = this.rooms.get(channelId);
    if (!room) {
      throw new StandardizedError(
        '找不到房間',
        'ValidationError',
        'GETRTPCAPABILITIES',
        'ROOM_NOT_FOUND',
        404,
      );
    }

    return room.router.rtpCapabilities;
  }

  setPeerRtpCapabilities(socketId, rtpCapabilities) {
    const peer = this.peers.get(socketId);
    if (!peer) {
      throw new StandardizedError(
        '找不到用戶',
        'ValidationError',
        'SETPEERRTPCAPABILITIES',
        'PEER_NOT_FOUND',
        404,
      );
    }

    peer.rtpCapabilities = rtpCapabilities;
    return true;
  }
}

// 創建單例
const sfuManager = new SfuManager();

module.exports = sfuManager;
