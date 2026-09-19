import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { VideoSliceState } from './types';

const DEFAULT_VIDEO_ID = 'FcRzAdI8R9U';
const DEFAULT_VIDEO_URL = 'https://www.youtube.com/watch?v=FcRzAdI8R9U';

const initialState: VideoSliceState = {
  videoId: DEFAULT_VIDEO_ID,
  currentUrl: DEFAULT_VIDEO_URL,
  startTime: undefined,
  detectedFormat: 'standard_watch',
  theaterMode: false,
  captionsEnabled: false,
  playerReady: false,
  playerState: 'unstarted',
  currentTime: 0,
  duration: 0,
  updateCount: 0,
  lastUpdateTimestamp: Date.now(),
  isLoopBlocked: false,
  loopWarning: null,
  loopProtectionBlockedCount: 0,
  recentUpdates: [],
};

// Redux Video Slice
export const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    setVideo: (
      state,
      action: PayloadAction<{
        videoId: string;
        url: string;
        startTime?: number;
        formatType?: string;
        source?: string;
      }>
    ) => {
      const { videoId, url, startTime, formatType, source } = action.payload;

      // Proper idempotent logic: if video is already active with identical params, do nothing
      if (
        state.videoId === videoId &&
        state.currentUrl === url &&
        state.startTime === startTime &&
        (!formatType || state.detectedFormat === formatType)
      ) {
        return;
      }

      state.videoId = videoId;
      state.currentUrl = url;
      state.startTime = startTime;
      if (formatType) state.detectedFormat = formatType;
      state.updateCount += 1;
      state.lastUpdateTimestamp = Date.now();
      state.isLoopBlocked = false;
      state.loopWarning = null;

      // Track in recent updates for history & diagnostic auditing (cap at 20)
      state.recentUpdates.unshift({
        videoId,
        startTime,
        timestamp: Date.now(),
        source: source || 'app',
      });
      if (state.recentUpdates.length > 20) {
        state.recentUpdates.pop();
      }
    },

    setPlayerReady: (state, action: PayloadAction<boolean>) => {
      state.playerReady = action.payload;
    },

    setPlayerState: (
      state,
      action: PayloadAction<'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued'>
    ) => {
      state.playerState = action.payload;
    },

    setCurrentTime: (state, action: PayloadAction<number>) => {
      state.currentTime = action.payload;
    },

    setDuration: (state, action: PayloadAction<number>) => {
      state.duration = action.payload;
    },

    setCaptionsEnabled: (state, action: PayloadAction<boolean>) => {
      state.captionsEnabled = action.payload;
    },

    setTheaterMode: (state, action: PayloadAction<boolean>) => {
      state.theaterMode = action.payload;
    },

    resetLoopGuard: (state) => {
      state.isLoopBlocked = false;
      state.loopWarning = null;
      state.recentUpdates = [];
    },
  },
});

export const {
  setVideo,
  setPlayerReady,
  setPlayerState,
  setCurrentTime,
  setDuration,
  setCaptionsEnabled,
  setTheaterMode,
  resetLoopGuard,
} = videoSlice.actions;

export default videoSlice.reducer;
