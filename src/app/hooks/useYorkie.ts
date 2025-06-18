'use client';

import { useEffect, useCallback, useState } from 'react';
import { YorkieClient, YorkieDocument } from '../../yorkie/types';
import { createYorkieClient, attachDocument, detachDocument, deactivateClient } from '../../yorkie/client';
import { initDocument, updateContent, getContent } from '../../yorkie/document';

let client: YorkieClient | null = null;
let doc: YorkieDocument | null = null;

interface UseYorkieResult {
  text: string;
  updateText: (content: string) => void;
  isConnected: boolean;
}

export function useYorkie(): UseYorkieResult {
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  
  // 초기화 함수
  useEffect(() => {
    async function initYorkie() {
      if (!client) {
        try {
          // 클라이언트 생성 및 활성화
          client = await createYorkieClient();
          
          // 문서 생성 및 연결
          doc = await attachDocument(client, 'collaborative-editor');
          
          // 문서 초기화
          if (doc) {
            initDocument(doc);
            
            // 초기 텍스트 설정
            const initialText = getContent(doc);
            setText(initialText);
          }
          
          // 문서 구독
          doc.subscribe((event) => {
            // 문서 변경 이벤트 처리
            if (doc) {
              const content = getContent(doc);
              setText(content);
            }
          });
          
          // 동기화 시작
          await client.sync();
          setIsConnected(true);
        } catch (err) {
          console.error('Yorkie 초기화 오류:', err);
          setIsConnected(false);
        }
      }
    }
    
    initYorkie();
    
    return () => {
      async function cleanup() {
        if (doc && client) {
          try {
            await detachDocument(client, doc);
          } catch (err) {
            console.error('문서 분리 오류:', err);
          }
        }
        
        if (client) {
          try {
            await deactivateClient(client);
            client = null;
            doc = null;
            setIsConnected(false);
          } catch (err) {
            console.error('클라이언트 비활성화 오류:', err);
          }
        }
      }
      
      cleanup();
    };
  }, []);
  
  // 문서 업데이트 함수
  const updateText = useCallback((content: string) => {
    if (doc) {
      updateContent(doc, content);
    }
  }, []);
  
  return { text, updateText, isConnected };
} 