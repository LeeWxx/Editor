import dynamic from 'next/dynamic';

// 클라이언트 컴포넌트를 동적으로 임포트 (SSR 비활성화)
const CollaborativeEditor = dynamic(
  () => import('./components/CollaborativeEditor'),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-2 md:p-6 w-full">
      <h1 className="text-3xl font-bold mb-8">실시간 협업 에디터</h1>
      <div className="w-full max-w-7xl">
        <CollaborativeEditor />
      </div>
    </main>
  );
}
