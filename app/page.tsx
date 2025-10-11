// app/page.tsx
// Main page - Server Component that loads the client component

import BreathingGuide from '@/components/BreathingGuide';

export default function Home() {
  return (
    <main className="min-h-screen">
      <BreathingGuide />
    </main>
  );
}
