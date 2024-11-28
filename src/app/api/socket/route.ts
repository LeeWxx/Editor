import { Server as IOServer } from 'socket.io';
import { NextResponse } from 'next/server';

// Socket.IO 서버 인스턴스 전역 저장
let io: IOServer | undefined;

export async function GET(req: Request) {
  // Socket.IO 서버 설정
  if (io === undefined) {
    // @ts-ignore
    const socketServer = (global as any).__socketServer;
  
    if (socketServer) {
      io = socketServer;
      console.log('기존 Socket.IO 서버를 재사용합니다.');
    } else {
      console.log('Socket.IO 서버가 초기화되지 않았습니다.');
    }
  }

  return NextResponse.json({ 
    status: 'ok',
    message: '',
    info: '클라이언트는 웹소켓을 통해 연결해야 합니다.',
    path: '/api/socket_io'
  });
} 