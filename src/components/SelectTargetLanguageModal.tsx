import React, { useState, useEffect, useMemo } from 'react';
import { Globe, Check, Settings2, X, ArrowLeft, Volume2, Gauge, Search, Plus, Layers, Sparkles } from 'lucide-react';
import {
  SUPPORTED_LANGUAGES_CATALOG,
  getUserLearningLanguages,
  setUserLearningLanguages,
  setVideoTargetLang,
  loadVideoSettings,
  saveVideoSettings,
  AppSettings,
  loadAppSettings,
  saveAppSettings,
  getSingleTargetLanguageMode,
  setSingleTargetLanguageMode,
} from '../utils/appSettings';

interface SelectTargetLanguageModalProps {
  isOpen: boolean;
  videoId: string;
  onClose: () => void;
  onSelectLanguage: (langCode: string) => void;
  onUpdateTtsRate?: (langCode: string, rate: number) => void;
  currentSelectedLang?: string | null;
  settings?: AppSettings;
  onUpdateSettings?: (newSettings: AppSettings) => void;
}

const TTS_RATE_PRESETS = [0.8, 1.0, 1.2, 1.5];

export const SelectTargetLanguageModal: React.FC<SelectTargetLanguageModalProps> = ({
  isOpen,
  videoId,
  onClose,
  onSelectLanguage,
  onUpdateTtsRate,
  currentSelectedLang,
  settings: propSettings,
  onUpdateSettings,
}) => {
  const [learningLanguages, setLearningLanguages] = useState<string[]>(() =>
    getUserLearningLanguages()
  );
  const [activeTab, setActiveTab] = useState<'my_languages' | 'all_languages'>('my_languages');
  const [searchQuery, setSearchQuery] = useState('');
  const [ttsRates, setTtsRates] = useState<Record<string, number>>({});
  const [isSingleMode, setIsSingleMode] = useState<boolean>(() => {
    if (propSettings?.singleTargetLanguageMode !== undefined) {
      return propSettings.singleTargetLanguageMode;
    }
    return getSingleTargetLanguageMode();
  });

  useEffect(() => {
    if (propSettings?.singleTargetLanguageMode !== undefined) {
      setIsSingleMode(propSettings.singleTargetLanguageMode);
    }
  }, [propSettings?.singleTargetLanguageMode]);

  useEffect(() => {
    if (!videoId) return;
    const vSettings = loadVideoSettings(videoId);
    if (vSettings?.ttsRates) {
      setTtsRates(vSettings.ttsRates);
    }
  }, [videoId, isOpen]);

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return SUPPORTED_LANGUAGES_CATALOG;
    const q = searchQuery.toLowerCase().trim();
    return SUPPORTED_LANGUAGES_CATALOG.filter(
      (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredLearningLangs = useMemo(() => {
    if (!searchQuery.trim()) return learningLanguages;
    const q = searchQuery.toLowerCase().trim();
    return learningLanguages.filter((code) => {
      const l = SUPPORTED_LANGUAGES_CATALOG.find((item) => item.code === code);
      return code.toLowerCase().includes(q) || (l && l.name.toLowerCase().includes(q));
    });
  }, [learningLanguages, searchQuery]);

  // Languages in search results that are NOT in the user's current learning list
  const nonLearningSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filteredCatalog.filter((l) => !learningLanguages.includes(l.code));
  }, [filteredCatalog, learningLanguages, searchQuery]);

  if (!isOpen) return null;

  const handleToggleParallelMode = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newSingle = !isSingleMode;
    setIsSingleMode(newSingle);
    setSingleTargetLanguageMode(newSingle);
    if (propSettings && onUpdateSettings) {
      onUpdateSettings({ ...propSettings, singleTargetLanguageMode: newSingle });
    }
  };

  const handleSelect = (code: string) => {
    if (!learningLanguages.includes(code)) {
      const updated = [...learningLanguages, code];
      setLearningLanguages(updated);
      setUserLearningLanguages(updated);
      if (propSettings && onUpdateSettings) {
        onUpdateSettings({ ...propSettings, learningLanguages: updated });
      }
    }
    setVideoTargetLang(videoId, code);
    onSelectLanguage(code);
    onClose();
  };

  const handleRateChange = (code: string, rate: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, Math.round(rate * 10) / 10));
    setTtsRates((prev) => ({ ...prev, [code]: clamped }));
    saveVideoSettings(videoId, {
      ttsRates: {
        [code]: clamped,
      },
    });
    onUpdateTtsRate?.(code, clamped);
  };

  const handleToggleLanguageInList = (code: string) => {
    let updated: string[];
    if (learningLanguages.includes(code)) {
      if (learningLanguages.length <= 1) return; // keep at least one
      updated = learningLanguages.filter((l) => l !== code);
    } else {
      updated = [...learningLanguages, code];
    }
    setLearningLanguages(updated);
    setUserLearningLanguages(updated);
    if (propSettings && onUpdateSettings) {
      onUpdateSettings({ ...propSettings, learningLanguages: updated });
    }
  };

  return (
    <div
      id="select-target-language-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="target-lang-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-5 text-neutral-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="target-lang-modal-title"
                className="text-base font-semibold text-white tracking-tight"
              >
                Target Languages &amp; Speech
              </h2>
              <p className="text-xs text-neutral-400">
                Choose from {SUPPORTED_LANGUAGES_CATALOG.length} languages &amp; configure TTS speed
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-target-language-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Parallel Multi-Language Translation Mode Toggle */}
        <div className="pt-3 pb-1">
          <div className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>Parallel Multi-Language Presentation</span>
              </div>
              <div className="text-[11px] text-neutral-400 mt-0.5">
                {isSingleMode
                  ? 'Showing 1 primary language. Turn on to display multiple languages in parallel.'
                  : `Parallel mode ON: Translating ${learningLanguages.length} languages simultaneously.`}
              </div>
            </div>
            <button
              type="button"
              id="toggle-parallel-mode-in-modal"
              data-testid="toggle-parallel-mode-in-modal"
              onClick={handleToggleParallelMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition shrink-0 ${
                !isSingleMode
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-950'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-600'
              }`}
            >
              {!isSingleMode ? 'Parallel: ON' : '1 Lang Only'}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="pt-3 pb-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-neutral-400" />
            <input
              type="text"
              id="search-target-language-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 70+ languages (e.g. Russian, Arabic, Spanish, hi)..."
              className="w-full pl-9 pr-3 py-2 bg-neutral-950/80 border border-neutral-800 focus:border-indigo-500 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 text-neutral-500 hover:text-neutral-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Segmented Tabs: My Learning List vs All Catalog */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-950/80 rounded-xl border border-neutral-800/70 mb-2">
          <button
            type="button"
            id="tab-my-languages"
            onClick={() => setActiveTab('my_languages')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'my_languages'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <span>My List</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {learningLanguages.length}
            </span>
          </button>
          <button
            type="button"
            id="tab-all-languages"
            onClick={() => setActiveTab('all_languages')}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
              activeTab === 'all_languages'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <span>All Catalog</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
              {SUPPORTED_LANGUAGES_CATALOG.length}
            </span>
          </button>
        </div>

        {/* Tab 1: My Learning List */}
        {activeTab === 'my_languages' && (
          <div className="py-2 space-y-3 flex-1 overflow-y-auto">
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredLearningLangs.map((code) => {
                const lang =
                  SUPPORTED_LANGUAGES_CATALOG.find((l) => l.code === code) || {
                    code,
                    name: code.toUpperCase(),
                  };
                const isSelected = currentSelectedLang === code;
                const currentRate = ttsRates[code] ?? 1.0;

                return (
                  <div
                    key={code}
                    id={`target-lang-card-${code}`}
                    className={`p-3 rounded-xl border transition flex flex-col gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500/80 ring-1 ring-indigo-500/40'
                        : 'bg-neutral-800/60 hover:bg-neutral-800/90 border-neutral-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        id={`target-lang-option-${code}`}
                        onClick={() => handleSelect(code)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-700 flex items-center justify-center font-mono text-xs text-indigo-300 uppercase font-semibold">
                          {code}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-white">{lang.name}</div>
                          <div className="text-[11px] text-neutral-400">
                            {isSelected ? 'Active Translation' : 'Click to select'}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelect(code)}
                        className={`min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center border transition ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-neutral-700 bg-neutral-900 text-neutral-400 hover:text-white'
                        }`}
                        title={isSelected ? 'Active language' : `Switch to ${lang.name}`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <span className="text-xs font-medium">Use</span>}
                      </button>
                    </div>

                    {/* Per-Language TTS Speech Rate Selector */}
                    <div className="pt-2 border-t border-neutral-700/40 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                        <span>TTS Speed:</span>
                        <span className="font-mono text-indigo-300 font-semibold">{currentRate}x</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {TTS_RATE_PRESETS.map((rate) => (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => handleRateChange(code, rate)}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono transition border ${
                              Math.abs(currentRate - rate) < 0.05
                                ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                                : 'bg-neutral-900 text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-600'
                            }`}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* If user is searching and there are more languages in the catalog */}
              {nonLearningSearchResults.length > 0 && (
                <div className="pt-3 border-t border-neutral-800 space-y-2">
                  <div className="text-xs font-medium text-neutral-400 flex items-center justify-between">
                    <span>Available in Full Catalog:</span>
                    <span className="text-[11px] font-mono text-indigo-400">
                      {nonLearningSearchResults.length} matches
                    </span>
                  </div>
                  {nonLearningSearchResults.slice(0, 10).map((lang) => (
                    <div
                      key={lang.code}
                      className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-2 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono uppercase text-[11px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300">
                          {lang.code}
                        </span>
                        <span className="text-xs font-medium text-white">{lang.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleLanguageInList(lang.code)}
                          className="px-2 py-1 rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white text-xs"
                          title="Add to My Learning List"
                        >
                          + Add to List
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelect(lang.code)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                          title="Select as active translation"
                        >
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick button to switch to all languages */}
            <div className="pt-2">
              <button
                type="button"
                id="manage-learning-languages-btn"
                onClick={() => setActiveTab('all_languages')}
                className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300 hover:text-white text-xs flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Add More from All {SUPPORTED_LANGUAGES_CATALOG.length} Languages</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: All 70+ Languages Catalog */}
        {activeTab === 'all_languages' && (
          <div className="py-2 space-y-3 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
              <span>Toggle to add/remove from your learning list:</span>
              <span className="text-[11px] font-mono text-indigo-400">
                {learningLanguages.length} in list
              </span>
            </div>
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredCatalog.map((lang) => {
                const isChecked = learningLanguages.includes(lang.code);
                const isSelected = currentSelectedLang === lang.code;

                return (
                  <div
                    key={lang.code}
                    className={`w-full min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between text-left transition text-xs ${
                      isChecked
                        ? 'bg-indigo-950/30 border-indigo-800/80 text-indigo-200'
                        : 'bg-neutral-800/50 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleLanguageInList(lang.code)}
                        className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-neutral-600 bg-neutral-900'
                        }`}
                        title={isChecked ? 'Remove from My List' : 'Add to My List'}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <span className="font-mono uppercase text-[11px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 shrink-0">
                        {lang.code}
                      </span>
                      <span className="font-medium text-neutral-200 truncate">{lang.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        id={`target-catalog-select-${lang.code}`}
                        data-testid={`target-catalog-select-${lang.code}`}
                        onClick={() => handleSelect(lang.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              id="finish-managing-languages-btn"
              onClick={() => {
                setActiveTab('my_languages');
                setSearchQuery('');
              }}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Learning List</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
