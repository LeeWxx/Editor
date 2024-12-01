import { v4 as uuidv4 } from 'uuid';

type ID = string;

interface RGAElement {
  id: ID;
  value: string;
  deleted: boolean;
  parentId: ID; // 부모 ID를 명시적으로 저장
  timestamp: number; // 타임스탬프 추가
}

export type InsertOp = { type: 'insert'; id: ID; value: string; parentId: ID; timestamp: number };
export type DeleteOp = { type: 'delete'; id: ID };
export type Op = InsertOp | DeleteOp;

export class RGA {
  private sequence: RGAElement[] = [];
  private indexById: Map<ID, number> = new Map();

  constructor() {
    // HEAD 노드로 시작
    const headId = 'HEAD';
    this.sequence.push({ 
      id: headId, 
      value: '', 
      deleted: false, 
      parentId: '',
      timestamp: 0 // HEAD는 0 타임스탬프
    });
    this.indexById.set(headId, 0);
  }

  // 로컬 삽입: position 위치 다음에 value 삽입 (문자 단위로)
  localInsert(position: number, value: string): InsertOp[] {
    // 단일 요소 대신 문자열의 각 문자를 개별 노드로 삽입
    const ops: InsertOp[] = [];
    const visibleElements = this.visibleElements();
    
    if (position < 0 || position >= visibleElements.length) {
      position = visibleElements.length - 1; // 범위를 벗어나면 마지막 요소 사용
    }
    
    // 삽입 지점의 부모 ID
    let parentId = visibleElements[position].id;
    
    // 문자열의 각 문자를 개별적으로 처리
    for (const char of value) {
      const id = uuidv4();
      const timestamp = Date.now(); // 현재 시간을 타임스탬프로 사용
      const op: InsertOp = { type: 'insert', id, value: char, parentId, timestamp };
      this.apply(op);
      ops.push(op);
      
      // 다음 문자의 부모 ID는 현재 삽입한 문자의 ID
      parentId = id;
    }
    
    return ops;
  }

  // 로컬 삭제: visible 요소 중 position 위치 요소 삭제
  localDelete(position: number): DeleteOp | null {
    const visibleElements = this.visibleElements();
    
    // position이 0이면 HEAD, 범위 밖이면 삭제 불가
    if (position <= 0 || position >= visibleElements.length) {
      return null;
    }
    
    const elem = visibleElements[position];
    const op: DeleteOp = { type: 'delete', id: elem.id };
    this.apply(op);
    return op;
  }

  // 특정 위치에서 여러 문자 삭제
  localDeleteRange(startPosition: number, count: number): DeleteOp[] {
    const ops: DeleteOp[] = [];
    const visibleElements = this.visibleElements();
    
    // 범위 검증 및 조정
    if (startPosition <= 0) startPosition = 1; // HEAD 이후부터 삭제 가능
    if (startPosition >= visibleElements.length) return ops;
    
    // 삭제할 문자 수 제한
    const endPosition = Math.min(startPosition + count, visibleElements.length);
    
    // 삭제할 요소들의 ID 먼저 수집 (삭제하면서 인덱스가 바뀌므로)
    const idsToDelete: ID[] = [];
    for (let i = startPosition; i < endPosition; i++) {
      idsToDelete.push(visibleElements[i].id);
    }
    
    // 수집한 ID 하나씩 삭제
    for (const id of idsToDelete) {
      const op: DeleteOp = { type: 'delete', id };
      this.apply(op);
      ops.push(op);
    }
    
    return ops;
  }

  // 모든 노드에 적용 가능한 apply
  apply(op: Op) {
    if (op.type === 'insert') {
      const parentIdx = this.indexById.get(op.parentId);
      if (parentIdx === undefined) return;
      
      const newElem: RGAElement = { 
        id: op.id, 
        value: op.value, 
        deleted: false,
        parentId: op.parentId,
        timestamp: op.timestamp
      };

      // 같은 부모를 가진 요소들 중 어디에 삽입할지 결정
      let insertIdx = parentIdx + 1;
      
      // 같은 부모를 가진 요소들 찾기
      const siblings: {element: RGAElement, index: number}[] = [];
      
      for (let i = 0; i < this.sequence.length; i++) {
        if (this.sequence[i].parentId === op.parentId) {
          siblings.push({element: this.sequence[i], index: i});
        }
      }
      
      // 타임스탬프로 내림차순 정렬 (최신 값이 앞으로)
      siblings.sort((a, b) => {
        const timeDiff = b.element.timestamp - a.element.timestamp; // 내림차순 정렬
        if (timeDiff !== 0) return timeDiff;
        // 동일 타임스탬프인 경우 ID로 추가 정렬
        return a.element.id.localeCompare(b.element.id);
      });
      
      // 새 요소의 위치 찾기
      let found = false;
      for (const sibling of siblings) {
        if (op.timestamp > sibling.element.timestamp || 
            (op.timestamp === sibling.element.timestamp && 
             op.id.localeCompare(sibling.element.id) < 0)) {
          insertIdx = sibling.index;
          found = true;
          break;
        }
      }
      
      // 위치를 찾지 못했다면 가장 마지막에 위치
      if (!found && siblings.length > 0) {
        insertIdx = siblings[siblings.length - 1].index + 1;
      }
      
      this.sequence.splice(insertIdx, 0, newElem);
      this.rebuildIndex();
    } else {
      const idx = this.indexById.get(op.id);
      if (idx !== undefined) {
        this.sequence[idx].deleted = true;
      }
    }
  }

  // 삭제되지 않은 요소들만 반환
  visibleElements(): RGAElement[] {
    return this.sequence.filter(el => !el.deleted);
  }

  // 현재 텍스트 상태
  getText(): string {
    // 깊이 우선 순회를 사용하여 텍스트 생성
    return this.traverseTree('HEAD');
  }

  // 깊이 우선 순회로 트리 탐색
  private traverseTree(nodeId: string): string {
    // 현재 노드의 값 (HEAD는 빈 문자열)
    const nodeIdx = this.indexById.get(nodeId);
    if (nodeIdx === undefined) return '';
    
    const currentNode = this.sequence[nodeIdx];
    let result = currentNode.value;
    
    // 이 노드의 자식들 찾기
    const children: RGAElement[] = [];
    for (const elem of this.sequence) {
      if (elem.parentId === nodeId && !elem.deleted) {
        children.push(elem);
      }
    }
    
    // 자식들을 타임스탬프 내림차순으로 정렬
    children.sort((a, b) => b.timestamp - a.timestamp);
    
    // 각 자식에 대해 재귀적으로 모든 자손 방문
    for (const child of children) {
      result += this.traverseTree(child.id);
    }
    
    return result;
  }

  // 내부 인덱스 재구성
  private rebuildIndex() {
    this.indexById.clear();
    this.sequence.forEach((el, idx) => this.indexById.set(el.id, idx));
  }
  
  // ID로 요소의 position 찾기
  findPositionById(id: ID): number {
    // 해당 요소의 텍스트 내 위치 계산
    const visibleSequence = this.visibleElements();
    
    // HEAD는 -1 반환 (텍스트에 포함되지 않음)
    if (id === 'HEAD') return -1;
    
    // 각 요소를 순회하며 위치 계산
    let position = 0;
    for (let i = 0; i < visibleSequence.length; i++) {
      // HEAD 노드는 스킵 (텍스트 위치에 포함되지 않음)
      if (i === 0) continue; 
      
      if (visibleSequence[i].id === id) {
        return position;
      }
      
      position += 1;
    }
    
    return -1; // 찾지 못함
  }
} 