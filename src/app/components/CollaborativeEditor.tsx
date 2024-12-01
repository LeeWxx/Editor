'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import { RGA, Op } from '../../crdt/rga';

export default function CollaborativeEditor() {
  const [text, setText] = useState('');
  const [operations, setOperations] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const rgaRef = useRef<RGA>(new RGA());
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  // 텍스트 상태 업데이트 함수
  const updateText = useCallback(() => {
    setText(rgaRef.current.getText());
  }, []);

  // 원격 작업을 처리하는 콜백
  const handleRemoteOperation = useCallback((op: Op) => {
    console.log('원격 작업 수신:', op);
    
    // 현재 커서 위치 저장
    const currentCursor = textAreaRef.current?.selectionStart || 0;
    
    // 작업 로그추가
    if (op.type === 'insert') {
      setOperations(prev => [...prev, `수신: ${op.type} - 텍스트: "${op.value}" 부모ID: ${op.parentId.slice(0, 4)} TS: ${op.timestamp % 10000}`]);
      
      // RGA에 작업 적용
      rgaRef.current.apply(op);
      
      // 텍스트 업데이트
      updateText();
      
      // 원격 삽입이 커서 위치 이전에 발생했다면 커서 위치 조정
      setTimeout(() => {
        if (textAreaRef.current) {
          const insertPos = rgaRef.current.findPositionById(op.parentId);
          if (insertPos < currentCursor) {
            const newPos = currentCursor + 1;
            textAreaRef.current.selectionStart = newPos;
            textAreaRef.current.selectionEnd = newPos;
            setCursorPosition(newPos);
          } else {
            textAreaRef.current.selectionStart = currentCursor;
            textAreaRef.current.selectionEnd = currentCursor;
          }
        }
      }, 0);
    } else if (op.type === 'delete') {
      setOperations(prev => [...prev, `수신: ${op.type} - ID: ${op.id.slice(0, 4)}`]);
      
      // 삭제된 요소의 위치 확인
      const deletePos = rgaRef.current.findPositionById(op.id);
      
      // RGA에 작업 적용
      rgaRef.current.apply(op);
      
      // 텍스트 업데이트
      updateText();
      
      // 원격 삭제가 커서 위치 이전에 발생했다면 커서 위치 조정
      setTimeout(() => {
        if (textAreaRef.current && deletePos < currentCursor) {
          const newPos = Math.max(0, currentCursor - 1);
          textAreaRef.current.selectionStart = newPos;
          textAreaRef.current.selectionEnd = newPos;
          setCursorPosition(newPos);
        } else {
          if (textAreaRef.current) {
            textAreaRef.current.selectionStart = currentCursor;
            textAreaRef.current.selectionEnd = currentCursor;
          }
        }
      }, 0);
    }
  }, [updateText]);

  // 소켓 훅 사용
  const emitOperation = useSocket(handleRemoteOperation);

  // 커서 위치 업데이트
  const handleCursorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCursorPosition(e.target.selectionStart);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition(textAreaRef.current?.selectionStart || 0);
  };
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition(textAreaRef.current?.selectionStart || 0);
  };

  // 텍스트 삽입
  const handleInsert = () => {
    const newText = prompt('추가할 텍스트를 입력하세요:');
    if (!newText) return;
    
    // 커서 위치에 해당하는 RGA 위치 찾기
    const visibleElements = rgaRef.current.visibleElements();
    
    // HEAD를 고려한 실제 RGA 위치 계산 (HEAD는 visibleElements[0])
    let position = 0; // HEAD 노드
    
    // cursorPosition으로 정확한 삽입 위치 계산
    if (cursorPosition === 0) {
      // 맨 앞에 삽입할 때는 HEAD를 부모로 사용 (position = 0)
      position = 0;
    } else {
      // 일반적인 경우 커서 위치에 해당하는 위치 (커서가 위치한 문자 앞)
      position = Math.min(cursorPosition, visibleElements.length - 1);
    }
    
    // 문자 단위로 삽입 - 여러 작업 반환
    const ops = rgaRef.current.localInsert(position, newText);
    
    // 각 작업 전송 및 로그 추가
    ops.forEach(op => {
      if (op.type === 'insert') {
        setOperations(prev => [
          ...prev, 
          `송신: ${op.type} - 텍스트: "${op.value}" 부모ID: ${op.parentId.slice(0, 4)} TS: ${op.timestamp % 10000}`
        ]);
        emitOperation(op);
      }
    });
    
    // 텍스트 업데이트
    updateText();
    
    // 커서 위치 업데이트
    setTimeout(() => {
      if (textAreaRef.current) {
        const newPosition = cursorPosition + newText.length;
        textAreaRef.current.selectionStart = newPosition;
        textAreaRef.current.selectionEnd = newPosition;
        setCursorPosition(newPosition);
      }
    }, 0);
  };

  // 텍스트 삭제 (커서 앞 한 문자)
  const handleDelete = () => {
    if (cursorPosition <= 0) return; // 커서가 처음이면 삭제할 것 없음
    
    // RGA에서 삭제할 위치 (HEAD 고려)
    const pos = cursorPosition;
    const op = rgaRef.current.localDelete(pos);
    
    if (op) {
      // 작업 로그에 추가
      setOperations(prev => [...prev, `송신: ${op.type} - ID: ${op.id.slice(0, 4)}`]);
      
      // 다른 클라이언트에 작업 전파
      emitOperation(op);
      
      // 텍스트 업데이트
      updateText();
      
      // 커서 위치 업데이트
      setTimeout(() => {
        if (textAreaRef.current) {
          const newPosition = Math.max(0, cursorPosition - 1);
          textAreaRef.current.selectionStart = newPosition;
          textAreaRef.current.selectionEnd = newPosition;
          setCursorPosition(newPosition);
        }
      }, 0);
    }
  };

  // 여러 문자 삭제 (선택 영역)
  const handleDeleteSelection = () => {
    if (!textAreaRef.current) return;
    
    const start = textAreaRef.current.selectionStart;
    const end = textAreaRef.current.selectionEnd;
    
    if (start === end) return; // 선택 영역 없으면 무시
    
    // 선택 영역의 문자 수
    const count = end - start;
    
    // 선택 영역 삭제
    const ops = rgaRef.current.localDeleteRange(start, count);
    
    // 각 작업 전송 및 로그 추가
    ops.forEach(op => {
      setOperations(prev => [...prev, `송신: ${op.type} - ID: ${op.id.slice(0, 4)}`]);
      emitOperation(op);
    });
    
    // 텍스트 업데이트
    updateText();
    
    // 커서 위치 업데이트
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.selectionStart = start;
        textAreaRef.current.selectionEnd = start;
        setCursorPosition(start);
      }
    }, 0);
  };

  // 키보드 입력 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 백스페이스 키 처리
    if (e.key === 'Backspace') {
      e.preventDefault(); // 기본 동작 방지
      
      const start = textAreaRef.current?.selectionStart || 0;
      const end = textAreaRef.current?.selectionEnd || 0;
      
      if (start === end) {
        // 선택 영역 없으면 한 문자만 삭제
        if (start > 0) handleDelete();
      } else {
        // 선택 영역 있으면 선택 영역 삭제
        handleDeleteSelection();
      }
    }
  };
  
  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      
      <textarea 
        ref={textAreaRef}
        className="w-full mb-4 p-4 border rounded-lg bg-gray-50 min-h-[300px] text-black resize-none"
        value={text}
        onChange={() => {}} // read-only, 변경은 CRDT 작업을 통해서만
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onSelect={handleCursorChange}
      />
      
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleInsert}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          텍스트 추가
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          커서 앞 문자 삭제
        </button>
      </div>
      
      <div className="text-sm mb-2">
        커서 위치: {cursorPosition}, 총 문자 수: {text.length}
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