import React, { useState, useEffect } from 'react';
import { Youtube, Settings, Library, Share2 } from 'lucide-react';
import { AppSettings } from '../utils/appSettings';

interface NavbarProps {
  onOpenLibrary?: () => void;
  libraryCount?: number;
  onOpenShare?: () => void;
  onOpenSettings?: () => void;
  onOpenArtifacts?: () => void;
  onOpenApkUpdate?: () => void;
  onOpenLogs?: () => void;
  onOpenTTSInputs?: () => void;
  hasApkUpdate?: boolean;
  latestApkVersion?: string;
  settings?: AppSettings;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLibrary,
  libraryCount,
  onOpenShare,
  onOpenSettings,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0">
            <Youtube className="w-4 h-4 fill-white stroke-none" />
          </div>
          <span className="font-semibold text-sm text-neutral-100">Language Learning</span>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenLibrary && (
            <button
              type="button"
              id="navbar-library-button"
              data-testid="navbar-library-button open-library-btn"
              onClick={onOpenLibrary}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 text-xs transition"
            >
              <Library className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
              {libraryCount !== undefined && libraryCount > 0 && (
                <span className="text-[10px] text-neutral-500">{libraryCount}</span>
              )}
            </button>
          )}
          {onOpenShare && (
            <button
              type="button"
              id="navbar-share-button"
              data-testid="navbar-share-button open-share-btn"
              onClick={onOpenShare}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 text-xs transition"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              id="navbar-settings-button"
              data-testid="navbar-settings-button settings-btn open-settings-button"
              onClick={onOpenSettings}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-neutral-800 text-neutral-300 text-xs transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
