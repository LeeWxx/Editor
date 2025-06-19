import * as yorkie from '@yorkie-js/sdk';

// 문서 타입 정의
export interface EditorDocumentType {
  content: string;
  updatedAt?: number;
}

// 클라이언트 인터페이스
export interface YorkieClient {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  attach<T>(doc: yorkie.Document<T>): Promise<void>;
  detach<T>(doc: yorkie.Document<T>): Promise<void>;
  sync(): Promise<void>;
  getID(): string | undefined;
}

// 문서 인터페이스
export interface YorkieDocument {
  id: string;
  subscribe(callback: (event: yorkie.DocEvent) => void): void;
  update(updater: (root: EditorDocumentType) => void): void;
  getRoot(): EditorDocumentType;
} 