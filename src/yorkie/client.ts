import * as yorkie from '@yorkie-js/sdk';
import { YorkieClient, YorkieDocument, EditorDocumentType } from './types';

// 원본 Yorkie 문서 객체를 저장하는 Map
const originalDocuments = new Map<string, yorkie.Document<EditorDocumentType>>();

// Yorkie 클라이언트를 YorkieClient 인터페이스로 변환하는 함수
function toYorkieClient(client: yorkie.Client): YorkieClient {
  return {
    activate: async () => { await client.activate(); },
    deactivate: async () => { await client.deactivate(); },
    attach: async <T>(doc: yorkie.Document<T>) => { await client.attach(doc); },
    detach: async <T>(doc: yorkie.Document<T>) => { await client.detach(doc); },
    sync: async () => { await client.sync(); },
    getID: () => client.getID()
  };
}

// 문서를 YorkieDocument 인터페이스로 변환하는 함수
function toYorkieDocument(doc: yorkie.Document<EditorDocumentType>): YorkieDocument {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  originalDocuments.set(docId, doc);
  
  return {
    id: docId,
    subscribe: (callback) => {
      doc.subscribe(callback);
    },
    update: (updater) => doc.update(updater),
    getRoot: () => doc.getRoot() as EditorDocumentType
  };
}

// Yorkie 클라이언트 생성
export async function createYorkieClient(): Promise<YorkieClient> {
  const client = new yorkie.Client({
    rpcAddr: 'http://localhost:8080',
  });

  try {
    // 클라이언트 활성화
    await client.activate();
    return toYorkieClient(client);
  } catch (err) {
    console.warn('Yorkie 서버 연결 실패, 메모리 모드로 사용:', err);
    const memClient = new yorkie.Client({ 
      rpcAddr: 'memory:' 
    });
    await memClient.activate();
    return toYorkieClient(memClient);
  }
}

// Yorkie 문서를 생성하고 연결하는 함수
export async function attachDocument(
  client: YorkieClient,
  docKey: string
): Promise<YorkieDocument> {
  // 새 문서 생성
  const doc = new yorkie.Document<EditorDocumentType>(docKey);
  
  // 문서에 클라이언트 연결
  await client.attach(doc);
  
  return toYorkieDocument(doc);
}

// 문서 분리 함수
export async function detachDocument(
  client: YorkieClient,
  doc: YorkieDocument
): Promise<void> {
  try {
    if (!doc.id) {
      throw new Error('문서 ID가 없습니다.');
    }
    
    // 원본 문서 객체 찾기
    const originalDoc = originalDocuments.get(doc.id);
    if (originalDoc) {
      await client.detach(originalDoc);
      originalDocuments.delete(doc.id);
    } else {
      console.warn('원본 문서를 찾을 수 없습니다:', doc.id);
    }
  } catch (err) {
    console.error('문서 분리 오류:', err);
  }
}

// Yorkie 클라이언트 비활성화
export async function deactivateClient(
  client: YorkieClient
): Promise<void> {
  await client.deactivate();
} 