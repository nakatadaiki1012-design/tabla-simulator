/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useState } from 'react';
import { ArrowLeft, GraduationCap, Headphones, Menu, Music2, Drum } from 'lucide-react';
import { LessonScreen } from './components/simple/LessonScreen';
import { PlayScreen } from './components/simple/PlayScreen';
import { ListenScreen } from './components/simple/ListenScreen';
import { SitarPanel } from './components/SitarPanel';
import { TablaVisualizer } from './components/TablaVisualizer';
import { AutoPlayer } from './components/AutoPlayer';
import { LearningHub } from './components/LearningHub';
import { KeyboardGuideModal } from './components/KeyboardGuideModal';
import { TaikoGame } from './components/TaikoGame';
import { TaalPlayer } from './components/TaalPlayer';
import { AcousticLab } from './components/AcousticLab';
import { TheoryGuide } from './components/TheoryGuide';
import { AnatomyAndTechnique } from './components/AnatomyAndTechnique';
import { ClassroomGuide } from './components/ClassroomGuide';
import { BolKey } from './types/tabla';

type Tab = 'lesson' | 'play' | 'listen' | 'sitar' | 'more' | 'old-play' | 'old-auto' | 'old-learn' | 'old-game' | 'old-taal' | 'old-lab' | 'old-theory' | 'old-anatomy' | 'old-teacher';

const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'lesson', label: 'レッスン', icon: <GraduationCap className="w-6 h-6" /> },
  { id: 'play', label: 'たたく', icon: <Drum className="w-6 h-6" /> },
  { id: 'listen', label: 'きく', icon: <Headphones className="w-6 h-6" /> },
  { id: 'sitar', label: 'シタール', icon: <Music2 className="w-6 h-6" /> },
  { id: 'more', label: 'その他', icon: <Menu className="w-6 h-6" /> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('lesson');
  const [keyGuide, setKeyGuide] = useState(false);
  const [, setTriggered] = useState<BolKey | null>(null);
  const onBol = useCallback((b: BolKey) => setTriggered(b), []);
  const isOld = tab.startsWith('old-');
  const navTab = isOld ? 'more' : tab;

  return (
    <div className="h-[100dvh] bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 overflow-hidden">
      {/* 上：ロゴと（PCでは）メニュー */}
      <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-stone-800 bg-stone-950">
        <button onClick={() => setTab('lesson')} className="font-extrabold text-lg flex items-center gap-1.5"><span>🪘</span>TablaLab</button>
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => (
            <button key={n.id} onClick={() => setTab(n.id)} className={`px-3 py-1.5 rounded-lg text-sm font-bold ${navTab === n.id ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-100'}`}>{n.label}</button>
          ))}
        </nav>
      </header>

      {/* 中身：各画面は1画面に収まる。従来の詳しい画面だけスクロール */}
      <main className={`flex-1 min-h-0 ${isOld ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {tab === 'lesson' && <LessonScreen />}
        {tab === 'play' && <PlayScreen />}
        {tab === 'listen' && <ListenScreen />}
        {tab === 'sitar' && <SitarPanel />}
        {tab === 'more' && (
          <div className="h-full flex flex-col gap-2 p-4 max-w-md mx-auto w-full">
            <button onClick={() => setTab('old-game')} className="text-left rounded-2xl bg-amber-700/90 px-4 py-3 shadow-lg">
              <div className="font-extrabold text-white">🎮 リズムゲーム</div><div className="text-xs text-amber-100">流れてくる音符に合わせて叩く</div>
            </button>
            <div className="text-xs text-stone-500 mt-1">くわしく学ぶ</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['old-taal', '🔄 ターラ再生'], ['old-theory', '📖 ボルと理論'], ['old-anatomy', '🖐 楽器と奏法'],
                ['old-lab', '🔬 音の実験室'], ['old-learn', '📚 しくみ（総合）'], ['old-teacher', '👩‍🏫 先生向け'],
                ['old-play', '🥁 くわしい演奏画面'], ['old-auto', '🎼 自動演奏（くわしい版）'],
              ] as const).map(([id, t]) => (
                <button key={id} onClick={() => setTab(id)} className="text-left rounded-xl bg-stone-900 border border-stone-800 px-3 py-3 font-bold text-sm text-stone-100">{t}</button>
              ))}
            </div>
            <button onClick={() => setKeyGuide(true)} className="text-left rounded-xl bg-stone-900 border border-stone-800 px-3 py-3 font-bold text-sm">⌨️ キー操作表</button>
            <div className="mt-auto text-[11px] text-stone-600">タブラーの録音：mmiron（Freesound・CC0）</div>
          </div>
        )}
        {isOld && (
          <div className="px-3 sm:px-6 py-3 max-w-7xl mx-auto w-full flex flex-col gap-3">
            <button onClick={() => setTab('more')} className="self-start flex items-center gap-1 text-sm text-stone-400 py-1"><ArrowLeft className="w-4 h-4" />もどる</button>
            {tab === 'old-play' && <TablaVisualizer activeBolKey={null} />}
            {tab === 'old-auto' && <AutoPlayer onBolPlayed={onBol} />}
            {tab === 'old-learn' && <LearningHub initialSubTab="lessons" onPlayBol={onBol} onNavigateToSimulator={() => setTab('play')} />}
            {tab === 'old-game' && <TaikoGame />}
            {tab === 'old-taal' && <TaalPlayer onBolTriggered={onBol} />}
            {tab === 'old-lab' && <AcousticLab />}
            {tab === 'old-theory' && <TheoryGuide onPlayBol={onBol} onNavigateToAutoPlay={() => setTab('listen')} />}
            {tab === 'old-anatomy' && <AnatomyAndTechnique onPlayBol={onBol} />}
            {tab === 'old-teacher' && <ClassroomGuide onPlayBol={onBol} onSelectTab={(t) => setTab(t === 'simulator' ? 'play' : t === 'acoustics' ? 'old-lab' : t === 'taal' ? 'old-taal' : 'old-anatomy')} />}
          </div>
        )}
      </main>

      {/* 下：大きなタブ（スマホ・タブレット） */}
      <nav className="md:hidden shrink-0 grid grid-cols-5 border-t border-stone-800 bg-stone-950 pb-[env(safe-area-inset-bottom)]">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setTab(n.id)} className={`flex flex-col items-center justify-center gap-0.5 py-2 ${navTab === n.id ? 'text-amber-400' : 'text-stone-500'}`}>
            {n.icon}<span className="text-[10px] font-bold">{n.label}</span>
          </button>
        ))}
      </nav>

      <KeyboardGuideModal isOpen={keyGuide} onClose={() => setKeyGuide(false)} />
    </div>
  );
}
