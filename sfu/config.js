/* eslint-disable @typescript-eslint/no-require-imports */
const os = require('os');

// 獲取本機 IP 地址
const getLocalIps = () => {
  const interfaces = os.networkInterfaces();
  const ipAddresses = [];

  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      // 只選擇 IPv4 地址且非內部地址
      if (info.family === 'IPv4' && !info.internal) {
        ipAddresses.push(info.address);
      }
    }
  }

  // 如果沒有找到外部 IP，則使用本地回環地址
  if (ipAddresses.length === 0) {
    ipAddresses.push('127.0.0.1');
  }

  return ipAddresses;
};

module.exports = {
  // mediasoup Worker 設置
  worker: {
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp',
    ],
  },
  // mediasoup Router 設置
  router: {
    mediaCodecs: [
      {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
      },
      {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
          'x-google-start-bitrate': 1000,
        },
      },
      {
        kind: 'video',
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
          'x-google-start-bitrate': 1000,
        },
      },
    ],
  },
  // WebRTC 傳輸設置
  webRtcTransport: {
    listenIps: getLocalIps().map(ip => ({ ip, announcedIp: null })),
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 600000,
    maxSctpMessageSize: 262144,
    maxIncomingBitrate: 1500000,
  },
};
