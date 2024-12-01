import { v4 as uuidv4 } from 'uuid';

type ID = string;

interface RGAElement {
  id: ID;
  value: string;
  deleted: boolean;
  parentId: ID; // 부모 ID를 명시적으로 저장
}

export type InsertOp = { type: 'insert'; id: ID; value: string; parentId: ID };
export type DeleteOp = { type: 'delete'; id: ID };
export type Op = InsertOp | DeleteOp;

export class RGA {
  private sequence: RGAElement[] = [];
  private indexById: Map<ID, number> = new Map();

  constructor() {
    // HEAD 노드로 시작
    const headId = 'HEAD';
    this.sequence.push({ id: headId, value: '', deleted: false, parentId: '' });
    this.indexById.set(headId, 0);
  }

  // 로컬 삽입: position 위치 다음에 value 삽입 (각 문자를 개별 노드로 삽입)
  localInsert(position: number, value: string): InsertOp[] {
    const ops: InsertOp[] = [];
    
    // position이 유효한지 확인
    if (position < 0 || position >= this.sequence.length) {
      position = 0; // 기본값으로 HEAD 노드 사용
    }
    
    let currentParent = this.sequence[position];
    
    // 문자열의 각 문자에 대해 개별 노드 생성
    for (const char of value) {
      // 항상 유효한 ID가 있는지 확인
      if (!currentParent || !currentParent.id) {
        currentParent = this.sequence[0]; // HEAD 노드로 fallback
      }
      
      const id = uuidv4();
      const op: InsertOp = { 
        type: 'insert', 
        id, 
        value: char, 
        parentId: currentParent.id 
      };
      
      this.apply(op);
      ops.push(op);
      
      // 다음 작업을 위해 새 요소를 찾음
      const newIdx = this.indexById.get(id);
      // 새 요소가 제대로 삽입되었는지 확인
      if (newIdx !== undefined) {
        currentParent = this.sequence[newIdx];
      }
    }
    
    return ops;
  }

  // 로컬 삭제: visible 요소 중 position 위치 요소 삭제
  localDelete(position: number): DeleteOp | null {
    const visibleElems = this.visibleElements();
    
    // 유효한 position인지 확인
    if (position < 0 || position >= visibleElems.length) {
      return null;
    }
    
    const elem = visibleElems[position];
    const op: DeleteOp = { type: 'delete', id: elem.id };
    this.apply(op);
    return op;
  }

  // 모든 노드에 적용 가능한 apply
  apply(op: Op) {
    if (op.type === 'insert') {
      // parentId가 유효한지 확인
      if (!op.parentId) {
        return; // 유효하지 않은 parentId
      }
      
      const parentIdx = this.indexById.get(op.parentId);
      if (parentIdx === undefined) return;
      
      const newElem: RGAElement = { 
        id: op.id, 
        value: op.value, 
        deleted: false,
        parentId: op.parentId 
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
      
      // ID로 정렬
      siblings.sort((a, b) => a.element.id.localeCompare(b.element.id));
      
      // 새 요소의 위치 찾기
      let found = false;
      for (const sibling of siblings) {
        if (op.id.localeCompare(sibling.element.id) < 0) {
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
      // delete operation일 경우
      if (!op.id) return; // 유효하지 않은 id
      
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
    return this.visibleElements().map(el => el.value).join('');
  }

  // 내부 인덱스 재구성
  private rebuildIndex() {
    this.indexById.clear();
    this.sequence.forEach((el, idx) => this.indexById.set(el.id, idx));
  }
} 