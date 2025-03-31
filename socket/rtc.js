/* eslint-disable @typescript-eslint/no-require-imports */
// Utils
const utils = require('../utils');
const {
  standardizedError: StandardizedError,
  logger: Logger,
  func: Func,
} = utils;

// Mediasoup imports
const mediasoup = require('mediasoup');

// Mediasoup configuration
const config = {
  mediasoup: {
    worker: {
      rtcMinPort: 10000,
      rtcMaxPort: 10100,
      logLevel: 'warn',
      logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp'],
    },
    router: {
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
      ],
    },
    webRtcTransport: {
      listenIps: [
        {
          ip: '0.0.0.0',
          announcedIp: process.env.ANNOUNCED_IP || '127.0.0.1', // 更換為你的服務器公共 IP
        },
      ],
      initialAvailableOutgoingBitrate: 1000000,
      minimumAvailableOutgoingBitrate: 600000,
      maxSctpMessageSize: 262144,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    },
  },
};

// Global objects
let worker = null;
const routers = new Map(); // channelId -> router
const transports = new Map(); // socketId -> transport
const producers = new Map(); // socketId -> producers[]
const consumers = new Map(); // socketId -> consumers[]

// 效能監控數據
const metrics = {
  totalConnections: 0,
  activeConnections: 0,
  peakConnections: 0,
  totalProducers: 0,
  totalConsumers: 0,
  routerCreationTime: [],
  transportCreationTime: [],
  errors: {
    worker: 0,
    router: 0,
    transport: 0,
    producer: 0,
    consumer: 0,
    dtls: 0,
    ice: 0,
    other: 0,
  },
};

// 定期清理並記錄指標
setInterval(() => {
  // 記錄當前活躍連接數
  metrics.activeConnections = transports.size;
  
  // 更新峰值連接數
  if (metrics.activeConnections > metrics.peakConnections) {
    metrics.peakConnections = metrics.activeConnections;
  }
  
  // 清理潛在的孤立資源
  cleanupOrphanedResources();
  
  // 記錄指標
  new Logger('RTC').info(`SFU 指標: ${JSON.stringify(metrics, null, 2)}`);
}, 60000); // 每分鐘執行一次

// 清理可能的孤立資源
async function cleanupOrphanedResources() {
  try {
    // 檢查並清理可能的孤立消費者
    for (const [socketId, consumerList] of consumers.entries()) {
      if (!transports.has(socketId)) {
        new Logger('RTC').warn(`發現孤立消費者，socketId: ${socketId}`);
        for (const consumer of consumerList) {
          try {
            consumer.close();
          } catch (error) {
            new Logger('RTC').error(`關閉孤立消費者時出錯: ${error.message}`);
          }
        }
        consumers.delete(socketId);
      }
    }

    // 檢查並清理可能的孤立生產者
    for (const [socketId, producerList] of producers.entries()) {
      if (!transports.has(socketId)) {
        new Logger('RTC').warn(`發現孤立生產者，socketId: ${socketId}`);
        for (const producer of producerList) {
          try {
            producer.close();
          } catch (error) {
            new Logger('RTC').error(`關閉孤立生產者時出錯: ${error.message}`);
          }
        }
        producers.delete(socketId);
      }
    }
  } catch (error) {
    new Logger('RTC').error(`清理孤立資源時出錯: ${error.message}`);
  }
}

// Initialize Mediasoup worker
async function initMediasoup() {
  if (worker) return worker;

  try {
    const startTime = Date.now();
    worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.worker.logLevel,
      logTags: config.mediasoup.worker.logTags,
      rtcMinPort: config.mediasoup.worker.rtcMinPort,
      rtcMaxPort: config.mediasoup.worker.rtcMaxPort,
    });

    worker.on('died', () => {
      metrics.errors.worker++;
      new Logger('RTC').error('Mediasoup worker died, exiting in 2 seconds...');
      setTimeout(() => process.exit(1), 2000);
    });

    const endTime = Date.now();
    new Logger('RTC').info(`Worker 創建時間: ${endTime - startTime}ms`);
    
    return worker;
  } catch (error) {
    metrics.errors.worker++;
    new Logger('RTC').error(
      `Error creating mediasoup worker: ${error.message}`,
    );
    throw error;
  }
}

// Get or create router for a channel
async function getRouter(channelId) {
  if (routers.has(channelId)) {
    return routers.get(channelId);
  }

  try {
    const startTime = Date.now();
    const router = await worker.createRouter({
      mediaCodecs: config.mediasoup.router.mediaCodecs,
    });
    
    // 設置路由器事件監聽
    router.on('workerclose', () => {
      new Logger('RTC').warn(`Router 關閉 (由於 Worker 關閉): ${channelId}`);
    });
    
    const endTime = Date.now();
    const creationTime = endTime - startTime;
    
    // 記錄路由器創建時間
    metrics.routerCreationTime.push(creationTime);
    if (metrics.routerCreationTime.length > 10) {
      metrics.routerCreationTime.shift(); // 保留最近 10 個樣本
    }
    
    new Logger('RTC').info(`Router 創建時間: ${creationTime}ms`);
    
    routers.set(channelId, router);
    return router;
  } catch (error) {
    metrics.errors.router++;
    new Logger('RTC').error(
      `Error creating router for channel ${channelId}: ${error.message}`,
    );
    throw error;
  }
}

// Create WebRTC transport
async function createTransport(router, socketId) {
  try {
    const startTime = Date.now();
    const transport = await router.createWebRtcTransport(
      config.mediasoup.webRtcTransport,
    );

    // 監聽 DTLS 狀態變化
    transport.on('dtlsstatechange', (dtlsState) => {
      new Logger('RTC').info(
        `Transport DTLS 狀態變更 (${socketId}): ${dtlsState}`,
      );
      
      if (dtlsState === 'failed' || dtlsState === 'closed') {
        metrics.errors.dtls++;
      }
      
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    // 監聽 ICE 連接狀態
    transport.on('icestatechange', (iceState) => {
      new Logger('RTC').info(
        `Transport ICE 狀態變更 (${socketId}): ${iceState}`,
      );
      
      if (iceState === 'failed' || iceState === 'closed') {
        metrics.errors.ice++;
      }
    });

    // 監聽連接關閉
    transport.on('close', () => {
      new Logger('RTC').info(
        `Transport closed for user(socket-id: ${socketId})`,
      );
      
      // 確保清理相關資源
      if (producers.has(socketId)) {
        producers.delete(socketId);
      }
      
      if (consumers.has(socketId)) {
        consumers.delete(socketId);
      }
    });

    const endTime = Date.now();
    const creationTime = endTime - startTime;
    
    // 記錄傳輸創建時間
    metrics.transportCreationTime.push(creationTime);
    if (metrics.transportCreationTime.length > 10) {
      metrics.transportCreationTime.shift(); // 保留最近 10 個樣本
    }
    
    new Logger('RTC').info(`Transport 創建時間: ${creationTime}ms`);
    
    // 更新連接計數
    metrics.totalConnections++;
    metrics.activeConnections = transports.size + 1; // +1 因為還沒添加到 Map 中
    
    if (metrics.activeConnections > metrics.peakConnections) {
      metrics.peakConnections = metrics.activeConnections;
    }
    
    transports.set(socketId, transport);
    return transport;
  } catch (error) {
    metrics.errors.transport++;
    new Logger('RTC').error(
      `Error creating WebRTC transport: ${error.message}`,
    );
    throw error;
  }
}

// Initialize mediasoup at startup
(async () => {
  try {
    await initMediasoup();
    new Logger('RTC').success('Mediasoup worker initialized successfully');
  } catch (error) {
    new Logger('RTC').error(
      `Failed to initialize mediasoup worker: ${error.message}`,
    );
  }
})();

const rtcHandler = {
  offer: async (io, socket, data) => {
    const startTime = Date.now();
    try {
      // Validate data
      const { channelId, offer } = data;
      if (!channelId || !offer) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'SENDRTCOFFER',
          'DATA_INVALID',
          401,
        );
      }

      // Validate operation
      await Func.validate.socket(socket);

      // Get router for this channel
      const router = await getRouter(channelId);

      // Create transport if not exists
      let transport = transports.get(socket.id);
      if (!transport) {
        transport = await createTransport(router, socket.id);
      }

      // Connect transport
      const { dtlsParameters } = offer;

      // 確保 dtlsParameters 格式正確
      if (!dtlsParameters || typeof dtlsParameters !== 'object') {
        throw new StandardizedError(
          'DTLS 參數格式不正確',
          'ValidationError',
          'SENDRTCOFFER',
          'DTLS_PARAMETERS_INVALID',
          401,
        );
      }

      // 調試日誌
      new Logger('RTC').info(
        `接收到的 dtlsParameters: ${JSON.stringify(dtlsParameters, null, 2)}`,
      );

      // 確保 fingerprints 是數組且不為空
      if (
        !dtlsParameters.fingerprints ||
        !Array.isArray(dtlsParameters.fingerprints) ||
        dtlsParameters.fingerprints.length === 0
      ) {
        if (
          dtlsParameters.fingerprint &&
          dtlsParameters.fingerprint.algorithm &&
          dtlsParameters.fingerprint.value
        ) {
          dtlsParameters.fingerprints = [
            {
              algorithm: dtlsParameters.fingerprint.algorithm,
              value: dtlsParameters.fingerprint.value,
            },
          ];
          new Logger('RTC').info(
            `從 fingerprint 轉換為 fingerprints: ${JSON.stringify(
              dtlsParameters.fingerprints,
              null,
              2,
            )}`,
          );
        } else if (offer.sdp) {
          // 嘗試從 SDP 中提取指紋
          try {
            const sdpLines = offer.sdp.split('\n');
            const fingerprintLine = sdpLines.find((line) =>
              line.includes('a=fingerprint:'),
            );
            if (fingerprintLine) {
              const parts = fingerprintLine
                .substring('a=fingerprint:'.length)
                .trim()
                .split(' ');
              if (parts.length >= 2) {
                const algorithm = parts[0];
                const value = parts[1];
                dtlsParameters.fingerprints = [{ algorithm, value }];
                new Logger('RTC').info(
                  `從 SDP 提取指紋: ${JSON.stringify(
                    dtlsParameters.fingerprints,
                    null,
                    2,
                  )}`,
                );
              }
            }
          } catch (err) {
            new Logger('RTC').error(`從 SDP 提取指紋失敗: ${err.message}`);
            metrics.errors.other++;
          }
        }

        // 如果仍然無法獲取有效的指紋，則拋出錯誤
        if (
          !dtlsParameters.fingerprints ||
          dtlsParameters.fingerprints.length === 0
        ) {
          metrics.errors.dtls++;
          throw new StandardizedError(
            '無效的 DTLS 指紋',
            'ValidationError',
            'SENDRTCOFFER',
            'DTLS_FINGERPRINTS_INVALID',
            401,
          );
        }

        // 調試日誌
        new Logger('RTC').info(
          `轉換後的 dtlsParameters: ${JSON.stringify(dtlsParameters, null, 2)}`,
        );
      }

      // 確保 role 屬性存在
      if (!dtlsParameters.role) {
        dtlsParameters.role = 'auto';
      }

      await transport.connect({ dtlsParameters });

      // 調試日誌
      new Logger('RTC').success(`成功連接傳輸: ${transport.id}`);

      try {
        // Create producer
        const producerStartTime = Date.now();
        const producer = await transport.produce({
          kind: 'audio',
          rtpParameters: {
            codecs: [
              {
                mimeType: 'audio/opus',
                payloadType: 111,
                clockRate: 48000,
                channels: 2,
                parameters: {
                  minptime: 10,
                  useinbandfec: 1,
                },
              },
            ],
            encodings: [
              {
                ssrc: Math.floor(Math.random() * 9000000) + 1000000,
                dtx: true, // 啟用不連續傳輸以節省頻寬
                priority: 'high',
              },
            ],
            ...(offer.rtpParameters || {}),
          },
          appData: { socketId: socket.id, channelId },
        });

        // 監控生產者事件
        producer.on('transportclose', () => {
          new Logger('RTC').info(`Producer closed due to transport close: ${producer.id}`);
        });

        producer.on('score', (score) => {
          // 只在分數變化較大時記錄，避免過多日誌
          if (score.length > 0 && (score[0].score < 5 || score[0].score > 8)) {
            new Logger('RTC').info(`Producer score for ${producer.id}: ${JSON.stringify(score)}`);
          }
        });

        const producerEndTime = Date.now();
        new Logger('RTC').info(`Producer 創建時間: ${producerEndTime - producerStartTime}ms`);

        // Store producer
        if (!producers.has(socket.id)) {
          producers.set(socket.id, []);
        }
        producers.get(socket.id).push(producer);
        metrics.totalProducers++;

        // Notify other users in the channel about this new producer
        socket.to(`channel_${channelId}`).emit('RTCOffer', {
          from: socket.id,
          producerId: producer.id,
        });

        // Send response to the client
        io.to(socket.id).emit('RTCOfferResponse', {
          id: producer.id,
          type: 'audio',
          rtpParameters: producer.rtpParameters,
        });

        const endTime = Date.now();
        new Logger('RTC').info(`RTC offer 處理時間: ${endTime - startTime}ms`);
      } catch (error) {
        metrics.errors.producer++;
        new Logger('RTC').error(`創建生產者時出錯: ${error.message}`);
        throw error;
      }
    } catch (error) {
      const endTime = Date.now();
      new Logger('RTC').info(`RTC offer 錯誤處理時間: ${endTime - startTime}ms`);

      if (!(error instanceof StandardizedError)) {
        metrics.errors.other++;
        error = new StandardizedError(
          `傳送 RTC offer 時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SENDRTCOFFER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('RTC').error(
        `Error processing RTC offer: ${error.error_message}`,
      );
    }
  },

  answer: async (io, socket, data) => {
    const startTime = Date.now();
    try {
      // Validate data
      const { channelId, answer, producerId } = data;
      if (!channelId || !answer || !producerId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'SENDRTCANSWER',
          'DATA_INVALID',
          401,
        );
      }

      // Validate operation
      await Func.validate.socket(socket);

      // Get router for this channel
      const router = await getRouter(channelId);

      // Create consumer transport if not exists
      let transport = transports.get(socket.id);
      if (!transport) {
        transport = await createTransport(router, socket.id);
      }

      // 確保 dtlsParameters 格式正確
      const dtlsParameters = answer.dtlsParameters;
      if (!dtlsParameters || typeof dtlsParameters !== 'object') {
        throw new StandardizedError(
          'DTLS 參數格式不正確',
          'ValidationError',
          'SENDRTCANSWER',
          'DTLS_PARAMETERS_INVALID',
          401,
        );
      }

      // 調試日誌
      new Logger('RTC').info(
        `接收到的 answer dtlsParameters: ${JSON.stringify(
          dtlsParameters,
          null,
          2,
        )}`,
      );

      // 確保 fingerprints 是數組且不為空
      if (
        !dtlsParameters.fingerprints ||
        !Array.isArray(dtlsParameters.fingerprints) ||
        dtlsParameters.fingerprints.length === 0
      ) {
        if (
          dtlsParameters.fingerprint &&
          dtlsParameters.fingerprint.algorithm &&
          dtlsParameters.fingerprint.value
        ) {
          dtlsParameters.fingerprints = [
            {
              algorithm: dtlsParameters.fingerprint.algorithm,
              value: dtlsParameters.fingerprint.value,
            },
          ];
          new Logger('RTC').info(
            `從 fingerprint 轉換為 fingerprints: ${JSON.stringify(
              dtlsParameters.fingerprints,
              null,
              2,
            )}`,
          );
        } else if (answer.sdp) {
          // 嘗試從 SDP 中提取指紋
          try {
            const sdpLines = answer.sdp.split('\n');
            const fingerprintLine = sdpLines.find((line) =>
              line.includes('a=fingerprint:'),
            );
            if (fingerprintLine) {
              const parts = fingerprintLine
                .substring('a=fingerprint:'.length)
                .trim()
                .split(' ');
              if (parts.length >= 2) {
                const algorithm = parts[0];
                const value = parts[1];
                dtlsParameters.fingerprints = [{ algorithm, value }];
                new Logger('RTC').info(
                  `從 SDP 提取指紋: ${JSON.stringify(
                    dtlsParameters.fingerprints,
                    null,
                    2,
                  )}`,
                );
              }
            }
          } catch (err) {
            new Logger('RTC').error(`從 SDP 提取指紋失敗: ${err.message}`);
            metrics.errors.other++;
          }
        }

        // 如果仍然無法獲取有效的指紋，則拋出錯誤
        if (
          !dtlsParameters.fingerprints ||
          dtlsParameters.fingerprints.length === 0
        ) {
          metrics.errors.dtls++;
          throw new StandardizedError(
            '無效的 DTLS 指紋',
            'ValidationError',
            'SENDRTCANSWER',
            'DTLS_FINGERPRINTS_INVALID',
            401,
          );
        }

        // 調試日誌
        new Logger('RTC').info(
          `轉換後的 answer dtlsParameters: ${JSON.stringify(
            dtlsParameters,
            null,
            2,
          )}`,
        );
      }

      // 確保 role 屬性存在
      if (!dtlsParameters.role) {
        dtlsParameters.role = 'auto';
      }

      await transport.connect({ dtlsParameters });

      // 調試日誌
      new Logger('RTC').success(`成功連接 answer 傳輸: ${transport.id}`);

      try {
        // Find the producer by ID
        let foundProducer = null;
        for (const [producerSocketId, producersList] of producers.entries()) {
          for (const producer of producersList) {
            if (producer.id === producerId) {
              foundProducer = producer;
              break;
            }
          }
          if (foundProducer) break;
        }

        if (!foundProducer) {
          throw new StandardizedError(
            '找不到對應的音訊源',
            'ValidationError',
            'SENDRTCANSWER',
            'PRODUCER_NOT_FOUND',
            404,
          );
        }

        // 確保 rtpCapabilities 有效
        if (!answer.rtpCapabilities) {
          answer.rtpCapabilities = router.rtpCapabilities;
          new Logger('RTC').info(
            `使用路由器默認 rtpCapabilities: ${JSON.stringify(
              answer.rtpCapabilities,
              null,
              2,
            )}`,
          );
        }

        // 檢查消費者兼容性
        if (!router.canConsume({
          producerId: foundProducer.id,
          rtpCapabilities: answer.rtpCapabilities,
        })) {
          throw new StandardizedError(
            'RTP 能力不兼容',
            'ValidationError',
            'SENDRTCANSWER',
            'INCOMPATIBLE_RTP_CAPABILITIES',
            400,
          );
        }

        const consumerStartTime = Date.now();
        // Create consumer
        const consumer = await transport.consume({
          producerId: foundProducer.id,
          rtpCapabilities: answer.rtpCapabilities,
          paused: false, // 自動開始消費
          appData: { socketId: socket.id, channelId, producerId: foundProducer.id },
        });

        // 監控消費者事件
        consumer.on('transportclose', () => {
          new Logger('RTC').info(`Consumer closed due to transport close: ${consumer.id}`);
        });

        consumer.on('producerclose', () => {
          new Logger('RTC').info(`Consumer closed due to producer close: ${consumer.id}`);
          
          // 通知客戶端生產者已關閉
          io.to(socket.id).emit('ProducerClosed', {
            consumerId: consumer.id,
            producerId: foundProducer.id,
          });
        });

        consumer.on('score', (score) => {
          // 只在分數變化較大時記錄，避免過多日誌
          if (score < 5 || score > 8) {
            new Logger('RTC').info(`Consumer score for ${consumer.id}: ${score}`);
          }
        });

        consumer.on('layerschange', (layers) => {
          new Logger('RTC').info(
            `Consumer layers changed ${consumer.id}: ${JSON.stringify(layers)}`,
          );
        });

        const consumerEndTime = Date.now();
        new Logger('RTC').info(`Consumer 創建時間: ${consumerEndTime - consumerStartTime}ms`);

        // Store consumer
        if (!consumers.has(socket.id)) {
          consumers.set(socket.id, []);
        }
        consumers.get(socket.id).push(consumer);
        metrics.totalConsumers++;

        // Send response to the client
        io.to(socket.id).emit('RTCAnswer', {
          id: consumer.id,
          producerId: foundProducer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });

        const endTime = Date.now();
        new Logger('RTC').info(`RTC answer 處理時間: ${endTime - startTime}ms`);
      } catch (error) {
        metrics.errors.consumer++;
        new Logger('RTC').error(`創建消費者時出錯: ${error.message}`);
        throw error;
      }
    } catch (error) {
      const endTime = Date.now();
      new Logger('RTC').info(`RTC answer 錯誤處理時間: ${endTime - startTime}ms`);

      if (!(error instanceof StandardizedError)) {
        metrics.errors.other++;
        error = new StandardizedError(
          `傳送 RTC answer 時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SENDRTCANSWER',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('RTC').error(
        `Error processing RTC answer: ${error.error_message}`,
      );
    }
  },

  candidate: async (io, socket, data) => {
    try {
      // Validate data
      const { channelId, candidate } = data;
      if (!channelId || !candidate) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'SENDRTCCANDIDATE',
          'DATA_INVALID',
          401,
        );
      }

      // Validate operation
      await Func.validate.socket(socket);

      // Get transport
      const transport = transports.get(socket.id);
      if (!transport) {
        throw new StandardizedError(
          '找不到對應的傳輸',
          'ValidationError',
          'SENDRTCCANDIDATE',
          'TRANSPORT_NOT_FOUND',
          404,
        );
      }

      // Add ICE candidate
      await transport.addIceCandidate(candidate);

      // In SFU model, we don't need to forward ICE candidates to others
      // But we acknowledge receipt
      io.to(socket.id).emit('RTCIceCandidateAck');
    } catch (error) {
      if (!(error instanceof StandardizedError)) {
        error = new StandardizedError(
          `傳送 RTC ICE candidate 時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'SENDRTCICECANDIDATE',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // Emit error data (only to the user)
      io.to(socket.id).emit('error', error);

      new Logger('RTC').error(
        `Error processing RTC ICE candidate: ${error.error_message}`,
      );
    }
  },

  join: async (io, socket, data) => {
    const startTime = Date.now();
    try {
      // Validate data
      const { channelId } = data;
      if (!channelId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'JOINRTCCHANNEL',
          'DATA_INVALID',
          401,
        );
      }

      // 驗證操作
      await Func.validate.socket(socket);

      // Get or create router for this channel
      const router = await getRouter(channelId);
      
      // Join socket.io room
      socket.join(`channel_${channelId}`);
      
      // 記錄用戶加入頻道
      new Logger('RTC').info(
        `User(socket-id: ${socket.id}) joined RTC channel: ${channelId}`,
      );

      // 為回饋提供 router 的 RTP 能力
      io.to(socket.id).emit('RTCRouterRtpCapabilities', {
        rtpCapabilities: router.rtpCapabilities,
      });
      
      // 創建該頻道所有現有生產者的清單
      const existingProducers = [];
      const channelSockets = await io.in(`channel_${channelId}`).fetchSockets();
      
      // 獲取除當前用戶外的所有用戶的生產者
      for (const channelSocket of channelSockets) {
        if (channelSocket.id !== socket.id && producers.has(channelSocket.id)) {
          const userProducers = producers.get(channelSocket.id);
          
          for (const producer of userProducers) {
            existingProducers.push({
              producerId: producer.id,
              socketId: channelSocket.id,
              kind: producer.kind,
            });
          }
        }
      }
      
      // 向客戶端發送現有生產者列表
      if (existingProducers.length > 0) {
        new Logger('RTC').info(
          `Sending ${existingProducers.length} existing producers to new user ${socket.id}`,
        );
        
        io.to(socket.id).emit('RTCExistingProducers', existingProducers);
      }
      
      const endTime = Date.now();
      new Logger('RTC').info(`RTC join 處理時間: ${endTime - startTime}ms`);
    } catch (error) {
      const endTime = Date.now();
      new Logger('RTC').info(`RTC join 錯誤處理時間: ${endTime - startTime}ms`);
      
      if (!(error instanceof StandardizedError)) {
        metrics.errors.other++;
        error = new StandardizedError(
          `加入 RTC 頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'JOINRTCCHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // 發送錯誤信息（僅發送給用戶）
      io.to(socket.id).emit('error', error);

      new Logger('RTC').error(
        `Error joining RTC channel(${data?.channelId}): ${error.error_message}`,
      );
    }
  },

  // 離開 RTC 頻道
  leave: async (io, socket, data) => {
    const startTime = Date.now();
    try {
      // Validate data
      const { channelId } = data;
      if (!channelId) {
        throw new StandardizedError(
          '無效的資料',
          'ValidationError',
          'LEAVERTCCHANNEL',
          'DATA_INVALID',
          401,
        );
      }

      // 驗證操作
      await Func.validate.socket(socket);

      // 記錄用戶離開頻道
      new Logger('RTC').info(
        `User(socket-id: ${socket.id}) leaving RTC channel: ${channelId}`,
      );
      
      // 保存用戶的生產者 ID，以便通知其他用戶
      const userProducerIds = [];
      if (producers.has(socket.id)) {
        for (const producer of producers.get(socket.id)) {
          userProducerIds.push(producer.id);
        }
      }

      // Close and remove all producers
      if (producers.has(socket.id)) {
        new Logger('RTC').info(
          `Closing ${producers.get(socket.id).length} producers for user ${socket.id}`,
        );
        
        for (const producer of producers.get(socket.id)) {
          try {
            producer.close();
          } catch (error) {
            new Logger('RTC').error(
              `Error closing producer ${producer.id}: ${error.message}`,
            );
          }
        }
        producers.delete(socket.id);
      }

      // Close and remove all consumers
      if (consumers.has(socket.id)) {
        new Logger('RTC').info(
          `Closing ${consumers.get(socket.id).length} consumers for user ${socket.id}`,
        );
        
        for (const consumer of consumers.get(socket.id)) {
          try {
            consumer.close();
          } catch (error) {
            new Logger('RTC').error(
              `Error closing consumer ${consumer.id}: ${error.message}`,
            );
          }
        }
        consumers.delete(socket.id);
      }

      // Close and remove transport
      if (transports.has(socket.id)) {
        const transport = transports.get(socket.id);
        try {
          transport.close();
        } catch (error) {
          new Logger('RTC').error(
            `Error closing transport ${transport.id}: ${error.message}`,
          );
        }
        transports.delete(socket.id);
        metrics.activeConnections = transports.size;
      }

      // Leave socket.io room
      socket.leave(`channel_${channelId}`);

      // Notify other users in the channel about this user leaving
      // and include the producerIds that are no longer available
      socket.to(`channel_${channelId}`).emit('RTCLeave', {
        socketId: socket.id,
        producerIds: userProducerIds,
      });

      // Check if channel is empty and cleanup router if needed
      const channelSockets = await io.in(`channel_${channelId}`).fetchSockets();
      if (channelSockets.length === 0 && routers.has(channelId)) {
        new Logger('RTC').info(
          `Channel ${channelId} is empty, cleaning up router`,
        );
        
        const router = routers.get(channelId);
        try {
          router.close();
        } catch (error) {
          new Logger('RTC').error(
            `Error closing router for channel ${channelId}: ${error.message}`,
          );
        }
        routers.delete(channelId);
      }
      
      const endTime = Date.now();
      new Logger('RTC').info(`RTC leave 處理時間: ${endTime - startTime}ms`);
    } catch (error) {
      const endTime = Date.now();
      new Logger('RTC').info(`RTC leave 錯誤處理時間: ${endTime - startTime}ms`);
      
      if (!(error instanceof StandardizedError)) {
        metrics.errors.other++;
        error = new StandardizedError(
          `離開 RTC 頻道時發生無法預期的錯誤: ${error.message}`,
          'ServerError',
          'LEAVERTCCHANNEL',
          'EXCEPTION_ERROR',
          500,
        );
      }

      // 發送錯誤信息（僅發送給用戶）
      io.to(socket.id).emit('error', error);

      new Logger('RTC').error(
        `Error leaving RTC channel(${data?.channelId}): ${error.error_message}`,
      );
    }
  },

  // Clean up resources when a socket disconnects
  disconnect: async (socket) => {
    const startTime = Date.now();
    try {
      new Logger('RTC').info(
        `Cleaning up resources for disconnected socket: ${socket.id}`,
      );
      
      // 找到該用戶所在的所有頻道和他的生產者 ID
      const userChannels = new Set();
      const userProducerIds = [];
      
      // 獲取用戶的所有生產者 ID
      if (producers.has(socket.id)) {
        for (const producer of producers.get(socket.id)) {
          userProducerIds.push(producer.id);
          
          // 通過生產者的 appData 找到頻道
          if (producer.appData && producer.appData.channelId) {
            userChannels.add(producer.appData.channelId);
          }
        }
      }
      
      // 通過消費者的 appData 找到頻道
      if (consumers.has(socket.id)) {
        for (const consumer of consumers.get(socket.id)) {
          if (consumer.appData && consumer.appData.channelId) {
            userChannels.add(consumer.appData.channelId);
          }
        }
      }

      // Close and remove all producers
      if (producers.has(socket.id)) {
        new Logger('RTC').info(
          `Closing ${producers.get(socket.id).length} producers for disconnected user ${socket.id}`,
        );
        
        for (const producer of producers.get(socket.id)) {
          try {
            producer.close();
          } catch (error) {
            new Logger('RTC').error(
              `Error closing producer ${producer.id} on disconnect: ${error.message}`,
            );
          }
        }
        producers.delete(socket.id);
      }

      // Close and remove all consumers
      if (consumers.has(socket.id)) {
        new Logger('RTC').info(
          `Closing ${consumers.get(socket.id).length} consumers for disconnected user ${socket.id}`,
        );
        
        for (const consumer of consumers.get(socket.id)) {
          try {
            consumer.close();
          } catch (error) {
            new Logger('RTC').error(
              `Error closing consumer ${consumer.id} on disconnect: ${error.message}`,
            );
          }
        }
        consumers.delete(socket.id);
      }

      // Close and remove transport
      if (transports.has(socket.id)) {
        const transport = transports.get(socket.id);
        try {
          transport.close();
        } catch (error) {
          new Logger('RTC').error(
            `Error closing transport ${transport.id} on disconnect: ${error.message}`,
          );
        }
        transports.delete(socket.id);
        metrics.activeConnections = transports.size;
      }
      
      // 通知所有用戶頻道中的其他用戶該用戶已離開
      for (const channelId of userChannels) {
        // 使用 socket.server 來接觸 socket.io 實例
        if (socket.server && socket.server.to) {
          socket.server.to(`channel_${channelId}`).emit('RTCLeave', {
            socketId: socket.id,
            producerIds: userProducerIds,
            reason: 'disconnected',
          });
        }
        
        // 檢查頻道是否為空，如果為空則清理路由器
        if (socket.server && socket.server.in) {
          try {
            const channelSockets = await socket.server.in(`channel_${channelId}`).fetchSockets();
            if (channelSockets.length === 0 && routers.has(channelId)) {
              new Logger('RTC').info(
                `Channel ${channelId} is empty after disconnect, cleaning up router`,
              );
              
              const router = routers.get(channelId);
              router.close();
              routers.delete(channelId);
            }
          } catch (error) {
            new Logger('RTC').error(
              `Error checking if channel ${channelId} is empty after disconnect: ${error.message}`,
            );
          }
        }
      }
      
      const endTime = Date.now();
      new Logger('RTC').info(`資源清理時間 (斷開連接): ${endTime - startTime}ms`);
    } catch (error) {
      metrics.errors.other++;
      new Logger('RTC').error(
        `Error cleaning up resources for disconnected socket(${socket.id}): ${error.message}`,
      );
    }
  },
};

module.exports = { ...rtcHandler };
