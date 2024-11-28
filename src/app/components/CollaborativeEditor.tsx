'use client';

import { useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';

export default function CollaborativeEditor() {
  const [text, setText] = useState('');
  const [operations, setOperations] = useState<string[]>([]);

  // 원격 작업을 처리하는 콜백
  const handleRemoteOperation = useCallback((op: any) => {
    console.log('원격 작업 수신:', op);
    setOperations(prev => [...prev, `수신: ${op.type} - ${op.data || '데이터 없음'}`]);
    
    if (op.type === 'add-text') {
      setText(prev => prev + op.data);
    }
  }, []);

  // 소켓 훅 사용
  const emitOperation = useSocket(handleRemoteOperation);

  // 로컬 작업 전송
  const handleSendOperation = () => {
    const newText = prompt('추가할 텍스트를 입력하세요:');
    if (newText) {
      const op = { type: 'add-text', data: newText };
      emitOperation(op);
      setOperations(prev => [...prev, `송신: ${op.type} - ${op.data}`]);
      setText(prev => prev + newText);
    }
  };

  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      
      <div className="mb-4 p-4 border rounded-lg bg-gray-50 min-h-[300px] text-black">
        {text}
      </div>
      
      <button
        onClick={handleSendOperation}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        텍스트 추가
      </button>
      
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">작업 로그</h2>
        <div className="border rounded-lg p-3 bg-gray-50 h-[200px] overflow-y-auto text-black">
          {operations.length === 0 ? (
            <p className="text-gray-500">아직 작업이 없습니다.</p>
          ) : (
            <ul className="space-y-1">
              {operations.map((op, index) => (
                <li key={index} className="text-sm">
                  {op}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
} 