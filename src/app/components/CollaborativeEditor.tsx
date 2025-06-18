'use client';

import { useCallback, useRef, useState } from 'react';
import { useYorkie } from '../hooks/useYorkie';

export default function CollaborativeEditor() {
  const [cursorPosition, setCursorPosition] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  
  const { text, updateText, isConnected } = useYorkie();

  // 텍스트 변경 처리
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    updateText(newText);
  }, [updateText]);

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
  
  return (
    <div className="p-4 w-full max-w-6xl mx-auto">
      <textarea 
        ref={textAreaRef}
        className="w-full mb-4 p-4 border rounded-lg bg-gray-50 min-h-[300px] text-black resize-none"
        value={text}
        onChange={handleTextChange}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onSelect={handleCursorChange}
      />
      
      <div className="text-sm mb-2">
        커서 위치: {cursorPosition}, 총 문자 수: {text.length}, 
        연결 상태: {isConnected ? '연결됨' : '연결 안됨'}
      </div>
    </div>
  );
} 