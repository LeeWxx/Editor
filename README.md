# Yorkie 기반 실시간 협업 에디터

[Yorkie](https://yorkie.dev/)를 활용한 실시간 협업 텍스트 에디터입니다.

## 핵심 기능
- 여러 사용자의 실시간 동시 편집
- Yorkie CRDT를 통한 편집 충돌 자동 해결
- 연결 상태 표시 및 자동 재연결

## 기술 스택
- Next.js
- TypeScript
- Yorkie (CRDT 기반 협업 프레임워크)
- Docker (Yorkie 서버)

## 실행 방법

### Yorkie 서버 실행
```bash
# Docker를 통해 Yorkie 서버 실행
docker-compose up -d
```

### 웹 애플리케이션 실행
```bash
# 패키지 설치
pnpm install

# 개발 서버 실행
pnpm run dev
```

