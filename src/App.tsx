/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Header, TabType } from './components/Header';
import { TablaVisualizer } from './components/TablaVisualizer';
import { AutoPlayer } from './components/AutoPlayer';
import { LearningHub } from './components/LearningHub';
import { KeyboardGuideModal } from './components/KeyboardGuideModal';
import { BolKey } from './types/tabla';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const [isKeyGuideOpen, setIsKeyGuideOpen] = useState<boolean>(false);
  const [currentTriggeredBol, setCurrentTriggeredBol] = useState<BolKey | null>(null);

  const handleBolTriggered = useCallback((bol: BolKey) => {
    setCurrentTriggeredBol(bol);
    setTimeout(() => {
      setCurrentTriggeredBol((prev) => (prev === bol ? null : prev));
    }, 50);
  }, []);

  const isLearningTab =
    activeTab === 'learning' ||
    activeTab === 'theory' ||
    activeTab === 'acoustics' ||
    activeTab === 'taal' ||
    activeTab === 'lessons';

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Bar adheres to Top Bar Contract */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onOpenKeyGuide={() => setIsKeyGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-3 sm:px-6 lg:px-8 py-3 sm:py-5 max-w-7xl w-full mx-auto flex flex-col gap-3 sm:gap-4">
        {/* Mobile Navigation Bar - Clean 3 Core Tabs */}
        <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-800">
          {[
            { id: 'simulator', label: '🪘 演奏・体験' },
            { id: 'autoplay', label: '🎵 巨匠の自動演奏' },
            { id: 'learning', label: '📚 学習・レッスン' },
          ].map((item) => {
            const isSelected = item.id === 'learning' ? isLearningTab : activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: Simulator (演奏・体験) */}
        {activeTab === 'simulator' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <TablaVisualizer activeBolKey={currentTriggeredBol} />
          </div>
        )}

        {/* TAB 2: Auto-Performance (巨匠の自動演奏 - 実際の名演を再現) */}
        {activeTab === 'autoplay' && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <AutoPlayer onBolPlayed={handleBolTriggered} />
          </div>
        )}

        {/* TAB 3: Unified Learning Hub (レッスン・音の仕組み・拍子体系) */}
        {isLearningTab && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <LearningHub
              initialSubTab={
                activeTab === 'theory' || activeTab === 'lessons'
                  ? 'lessons'
                  : activeTab === 'taal'
                  ? 'taal'
                  : 'lessons'
              }
              onPlayBol={handleBolTriggered}
              onNavigateToSimulator={() => setActiveTab('simulator')}
            />
          </div>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="mt-auto border-t border-stone-800 bg-stone-950 px-6 py-5 text-stone-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-300">TablaLab</span>
            <span aria-hidden="true">·</span>
            <span>教育用タブラー・バーヤーン音響シミュレーター ＆ 古典演奏再現</span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <button
              onClick={() => setActiveTab('simulator')}
              className="hover:text-stone-200 transition-colors"
            >
              演奏
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('autoplay')}
              className="hover:text-stone-200 transition-colors"
            >
              自動演奏
            </button>
            <span aria-hidden="true">·</span>
            <button
              onClick={() => setActiveTab('learning')}
              className="hover:text-amber-300 transition-colors font-semibold"
            >
              学習・レッスン
            </button>
          </div>
        </div>
      </footer>

      {/* Keyboard Guide Modal */}
      <KeyboardGuideModal
        isOpen={isKeyGuideOpen}
        onClose={() => setIsKeyGuideOpen(false)}
      />
    </div>
  );
}
