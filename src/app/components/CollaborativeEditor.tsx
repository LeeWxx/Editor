'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { RGA, Op } from '../../crdt/rga';

export default function CollaborativeEditor() {
  const [text, setText] = useState('');
  const [operations, setOperations] = useState<string[]>([]);
  const rgaRef = useRef<RGA>(new RGA());
  
  // 텍스트 상태 업데이트 함수
  const updateText = useCallback(() => {
    setText(rgaRef.current.getText());
  }, []);

  // 원격 작업을 처리하는 콜백
  const handleRemoteOperation = useCallback((op: Op) => {
    console.log('원격 작업 수신:', op);
    
    // 작업 로그에 추가
    if (op.type === 'insert') {
      setOperations(prev => [...prev, `수신: ${op.type} - 텍스트: "${op.value}" 부모ID: ${op.parentId.slice(0, 4)}`]);
    } else {
      setOperations(prev => [...prev, `수신: ${op.type} - ID: ${op.id.slice(0, 4)}`]);
    }
    
    // RGA에 작업 적용
    rgaRef.current.apply(op);
    updateText();
  }, [updateText]);

  // 소켓 훅 사용
  const emitOperation = useSocket(handleRemoteOperation);

  // 텍스트 삽입
  const handleInsert = () => {
    const newText = prompt('추가할 텍스트를 입력하세요:');
    if (!newText) return;
    
    // 마지막 위치에 삽입 (HEAD만 있으면 0, 아니면 마지막 요소 인덱스)
    const position = rgaRef.current.visibleElements().length - 1;
    
    // 텍스트 전체를 하나의 작업으로 처리
    const op = rgaRef.current.localInsert(position, newText);
    
    // 작업 로그에 추가
    setOperations(prev => [...prev, `송신: ${op.type} - 텍스트: "${op.value}" 부모ID: ${op.parentId.slice(0, 4)}`]);
    
    // 다른 클라이언트에 작업 전파
    emitOperation(op);
    updateText();
  };

  // 텍스트 삭제
  const handleDelete = () => {
    const visibleElements = rgaRef.current.visibleElements();
    if (visibleElements.length <= 1) return; // HEAD만 있으면 삭제 X
    
    // 마지막 문자 삭제
    const op = rgaRef.current.localDelete(visibleElements.length - 1);
    
    // 작업 로그에 추가
    setOperations(prev => [...prev, `송신: ${op.type} - ID: ${op.id.slice(0, 4)}`]);
    
    // 다른 클라이언트에 작업 전파
    emitOperation(op);
    updateText();
  };
  
  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      
      <div className="mb-4 p-4 border rounded-lg bg-gray-50 min-h-[300px] text-black">
        {text}
      </div>
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleInsert}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          문자열 추가
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          마지막 문자열 삭제
        </button>
      </div>
      
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