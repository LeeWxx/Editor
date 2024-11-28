/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Socket.IO 서버 관련 설정을 위한 웹팩 구성
      config.externals.push({
        'bufferutil': 'bufferutil',
        'utf-8-validate': 'utf-8-validate',
      });
    }
    return config;
  },
  // Socket.IO 초기화를 위한 커스텀 서버 활성화
  experimental: {
    serverComponentsExternalPackages: ['socket.io', 'socket.io-client'],
  },
};

export default nextConfig;
