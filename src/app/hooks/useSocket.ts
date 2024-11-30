'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Op } from '../../crdt/rga';

export function useSocket(onOp: (op: Op) => void) {
  const socketRef = useRef<Socket>();

  useEffect(() => {
    // 서버 URL과 path 설정
    const socket = io('/', {
      path: '/api/socket_io',
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('crdt-op', (op: Op) => {
      onOp(op);
    });

    return () => {
      socket.disconnect();
    };
  }, [onOp]);

  // 로컬에서 생성한 op을 서버에 전송
  const emitOp = (op: Op) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('crdt-op', op);
    }
  };

  return emitOp;
} 