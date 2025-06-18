import { YorkieDocument, EditorDocumentType } from './types';

// 문서 초기화 함수
export function initDocument(doc: YorkieDocument): void {
  // 문서가 초기화되지 않았다면 초기화
  doc.update((root) => {
    if (!root.content) {
      root.content = '';
      root.updatedAt = Date.now();
    }
  });
}

// 문서 내용 업데이트 함수
export function updateContent(doc: YorkieDocument, content: string): void {
  doc.update((root) => {
    root.content = content;
    root.updatedAt = Date.now();
  });
}

// 문서 내용 가져오기 함수
export function getContent(doc: YorkieDocument): string {
  const root = doc.getRoot();
  return root.content || '';
} 