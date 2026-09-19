import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppStateMachineState, StateMachineTransition, ReduxActionAuditRecord } from './types';

interface StateMachineSliceState {
  currentState: AppStateMachineState;
  previousState: AppStateMachineState | null;
  history: StateMachineTransition[];
  actionAuditTrail: ReduxActionAuditRecord[];
  lastAction: string | null;
}

const initialState: StateMachineSliceState = {
  currentState: 'idle',
  previousState: null,
  history: [],
  actionAuditTrail: [],
  lastAction: null,
};

// Define valid state transitions (including self-transitions and recovery routes)
const VALID_TRANSITIONS: Record<AppStateMachineState, AppStateMachineState[]> = {
  idle: ['idle', 'loading_video', 'video_ready', 'fetching_captions', 'error', 'loop_detected'],
  loading_video: ['loading_video', 'video_ready', 'fetching_captions', 'captions_loaded', 'playing', 'paused', 'syncing_tts', 'error', 'loop_detected', 'idle'],
  video_ready: ['video_ready', 'loading_video', 'fetching_captions', 'captions_loaded', 'playing', 'paused', 'syncing_tts', 'error', 'loop_detected'],
  fetching_captions: ['fetching_captions', 'captions_loaded', 'video_ready', 'playing', 'paused', 'syncing_tts', 'error', 'loop_detected'],
  captions_loaded: ['captions_loaded', 'playing', 'paused', 'syncing_tts', 'loading_video', 'video_ready', 'error', 'loop_detected'],
  playing: ['playing', 'paused', 'syncing_tts', 'loading_video', 'video_ready', 'captions_loaded', 'error', 'loop_detected'],
  paused: ['paused', 'playing', 'syncing_tts', 'loading_video', 'video_ready', 'captions_loaded', 'error', 'loop_detected'],
  syncing_tts: ['syncing_tts', 'playing', 'paused', 'video_ready', 'captions_loaded', 'loading_video', 'error', 'loop_detected'],
  loop_detected: ['idle', 'loading_video', 'video_ready', 'error'],
  error: ['idle', 'loading_video', 'video_ready', 'fetching_captions', 'error'],
};

export const stateMachineSlice = createSlice({
  name: 'stateMachine',
  initialState,
  reducers: {
    transition: (
      state,
      action: PayloadAction<{
        to: AppStateMachineState;
        actionName: string;
        payload?: any;
        force?: boolean;
      }>
    ) => {
      const { to, actionName, payload, force } = action.payload;
      const from = state.currentState;

      const isValid = force || (VALID_TRANSITIONS[from] && VALID_TRANSITIONS[from].includes(to));

      const transitionEntry: StateMachineTransition = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        from,
        to,
        action: actionName,
        payload,
        timestamp: Date.now(),
      };

      state.history.unshift(transitionEntry);
      if (state.history.length > 60) {
        state.history.pop();
      }

      state.previousState = from;
      state.currentState = to;
      state.lastAction = actionName;

      if (!isValid) {
        console.warn(`[StateMachine Notice] Transitioned from "${from}" to "${to}" via "${actionName}"`);
      }
    },

    recordReduxAction: (state, action: PayloadAction<ReduxActionAuditRecord>) => {
      state.actionAuditTrail.unshift(action.payload);
      if (state.actionAuditTrail.length > 80) {
        state.actionAuditTrail.pop();
      }
    },

    clearActionAuditTrail: (state) => {
      state.actionAuditTrail = [];
    },

    resetStateMachine: (state) => {
      state.previousState = state.currentState;
      state.currentState = 'idle';
      state.lastAction = 'RESET';
    },
  },
});

export const { transition, recordReduxAction, clearActionAuditTrail, resetStateMachine } =
  stateMachineSlice.actions;
export default stateMachineSlice.reducer;

