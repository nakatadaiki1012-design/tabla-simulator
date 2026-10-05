import React from 'react';
import { HelpCircle, Download } from 'lucide-react';

export type TabType =
  | 'simulator'
  | 'autoplay'
  | 'taiko'
  | 'learning'
  | 'theory'
  | 'acoustics'
  | 'taal'
  | 'lessons';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenKeyGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onOpenKeyGuide }) => {
  const isLearningTab =
    activeTab === 'learning' ||
    activeTab === 'theory' ||
    activeTab === 'acoustics' ||
    activeTab === 'taal' ||
    activeTab === 'lessons';

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md sticky top-0 z-50">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => onTabChange('simulator')}
        className="text-lg font-bold tracking-tight text-stone-100 hover:text-amber-400 transition-colors cursor-pointer text-left flex items-center gap-2"
      >
        <span className="text-xl">🪘</span>
        <span className="font-extrabold tracking-tight">TablaLab</span>
      </button>

      {/* Zone 2: 3 clean text navigation links */}
      <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-stone-400">
        <button
          onClick={() => onTabChange('simulator')}
          className={`hover:text-stone-100 transition-colors whitespace-nowrap ${
            activeTab === 'simulator'
              ? 'text-amber-400 font-bold underline underline-offset-8 decoration-2'
              : ''
          }`}
        >
          演奏・体験
        </button>
        <button
          onClick={() => onTabChange('autoplay')}
          className={`hover:text-stone-100 transition-colors whitespace-nowrap ${
            activeTab === 'autoplay'
              ? 'text-amber-400 font-bold underline underline-offset-8 decoration-2'
              : ''
          }`}
        >
          巨匠の自動演奏
        </button>
        <button
          onClick={() => onTabChange('learning')}
          className={`hover:text-stone-100 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            isLearningTab
              ? 'text-amber-400 font-bold underline underline-offset-8 decoration-2'
              : 'text-stone-300 hover:text-amber-300'
          }`}
        >
          <span>学習・レッスン</span>
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2.5">
        <a
          href="/tabla-simulator-project.zip"
          download="tabla-simulator-project.zip"
          className="px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/80 rounded-lg hover:bg-amber-900 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer"
          title="プロジェクト全ソースコード・音源データをZIPで一括ダウンロード"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">全コードZIP保存</span>
          <span className="sm:hidden">ZIP保存</span>
        </a>

        <button
          onClick={onOpenKeyGuide}
          className="px-3 py-1.5 text-xs font-semibold text-stone-200 bg-stone-900 border border-stone-800 rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-1.5 whitespace-nowrap shadow-sm"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden sm:inline">キー操作表</span>
          <span className="sm:hidden">キー表</span>
        </button>
      </div>
    </header>
  );
};
