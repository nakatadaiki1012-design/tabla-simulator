import React, { useState } from 'react';
import { CLASSROOM_LESSONS } from '../data/tablaData';
import { ClassroomLesson, BolKey } from '../types/tabla';
import { tablaAudio } from '../audio/tablaAudioEngine';
import { BookOpen, CheckCircle2, Play, Sparkles } from 'lucide-react';

interface Props {
  onSelectTab: (tab: 'simulator' | 'acoustics' | 'taal' | 'anatomy') => void;
  onPlayBol: (bol: BolKey) => void;
}

export const ClassroomGuide: React.FC<Props> = ({ onSelectTab, onPlayBol }) => {
  const [selectedLessonId, setSelectedLessonId] = useState<string>(CLASSROOM_LESSONS[0].id);

  const currentLesson =
    CLASSROOM_LESSONS.find((l) => l.id === selectedLessonId) || CLASSROOM_LESSONS[0];

  const handleApplyExperiment = (lesson: ClassroomLesson) => {
    if (lesson.experimentSettings) {
      if (lesson.experimentSettings.syahiMass !== undefined) {
        tablaAudio.setSyahiMass(lesson.experimentSettings.syahiMass);
      }
      if (lesson.experimentSettings.damping !== undefined) {
        tablaAudio.setDamping(lesson.experimentSettings.damping);
      }
      if (lesson.experimentSettings.tension !== undefined) {
        tablaAudio.setSkinTension(lesson.experimentSettings.tension);
      }
    }

    if (lesson.id === 'lesson_1_syahi') {
      onSelectTab('acoustics');
      tablaAudio.playBol('tun');
    } else if (lesson.id === 'lesson_2_fingering') {
      onSelectTab('simulator');
      tablaAudio.playBol('na');
    } else if (lesson.id === 'lesson_3_bayan_meend') {
      onSelectTab('simulator');
      tablaAudio.playBol('meend', 1.7);
    } else if (lesson.id === 'lesson_4_taal_cosmos') {
      onSelectTab('taal');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Introduction */}
      <div className="p-6 rounded-2xl bg-stone-900 border border-stone-800 text-stone-200">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-stone-100">
            授業用カリキュラム・学習ガイド（音楽・物理横断授業）
          </h2>
        </div>
        <p className="text-sm text-stone-400 mt-1.5 leading-relaxed">
          音楽科の「世界の民族音楽」「リズム表現」や、理科・物理科の「音と波」「固有振動・倍音」の単元で活用できる、体験型学習ユニットです。
          各レッスンの解説を読み、ワンクリックで該当の音響実験やシミュレーターを起動できます。
        </p>

        {/* Lesson Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-5">
          {CLASSROOM_LESSONS.map((lesson, idx) => (
            <button
              key={lesson.id}
              onClick={() => setSelectedLessonId(lesson.id)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                selectedLessonId === lesson.id
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md scale-[1.02]'
                  : 'bg-stone-950 text-stone-300 border-stone-800 hover:border-stone-700 hover:bg-stone-900'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedLessonId === lesson.id ? 'bg-amber-800/80 text-white' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  第{idx + 1}時限
                </span>
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    selectedLessonId === lesson.id ? 'text-amber-200' : 'text-stone-500'
                  }`}
                />
              </div>
              <span className="text-xs font-bold line-clamp-2">{lesson.title.split('：')[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Lesson Detail Sheet */}
      <div className="p-6 md:p-8 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-800">
          <div>
            <h3 className="text-xl font-bold text-stone-100">{currentLesson.title}</h3>
            <p className="text-xs text-amber-400 font-medium mt-0.5">{currentLesson.subtitle}</p>
          </div>

          <button
            onClick={() => handleApplyExperiment(currentLesson)}
            className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow transition-colors flex items-center gap-2 self-start md:self-center"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>この授業の実験をシミュレーターで実行</span>
          </button>
        </div>

        {/* Target Bols & Learning Concepts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
            <span className="text-xs font-semibold text-stone-400">学習する主な奏法（ボル）:</span>
            <div className="flex flex-wrap gap-2">
              {currentLesson.targetBols.map((bol) => (
                <button
                  key={bol}
                  onClick={() => onPlayBol(bol)}
                  className="px-3 py-1.5 text-xs font-bold bg-stone-800 hover:bg-amber-600 hover:text-white text-stone-200 rounded-lg border border-stone-700 transition-colors flex items-center gap-1.5"
                >
                  <Play className="w-3 h-3 text-amber-400" />
                  <span className="uppercase">{bol}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex flex-col gap-2">
            <span className="text-xs font-semibold text-stone-400">習得する科学・音楽の概念:</span>
            <div className="flex flex-wrap gap-2">
              {currentLesson.concepts.map((concept) => (
                <span
                  key={concept}
                  className="text-xs text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-900/60 flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-amber-500" />
                  {concept}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Explanation Text */}
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-bold text-stone-200">授業の解説（教科書・スライド用）</h4>
          <div className="p-5 rounded-xl bg-stone-950/80 border border-stone-800 text-sm text-stone-300 leading-relaxed whitespace-pre-line">
            {currentLesson.explanation}
          </div>
        </div>

        {/* Classroom Goal & Interactive Mission */}
        <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-amber-300">生徒への探究ミッション:</span>
            <p className="text-xs text-stone-200 leading-relaxed">{currentLesson.interactiveGoal}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
