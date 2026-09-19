import { configureStore, Middleware } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import videoReducer from './videoSlice';
import stateMachineReducer, { recordReduxAction } from './stateMachineSlice';
import errorsReducer from './errorsSlice';
import networkReducer from './networkSlice';
import { logWarn } from '../utils/logBuffer';

// Rate cap sliding window configurations (Step 1.2: Rate caps and infinite loop detection)
const ACTION_RATE_WINDOW_MS = 2000;
const MAX_ACTIONS_PER_WINDOW = 25;
const CRITICAL_ACTION_CAP = 50;

interface RateLimitTracker {
  count: number;
  windowStart: number;
  throttledWarned: boolean;
}

const actionRateMap = new Map<string, RateLimitTracker>();

/**
 * Summarize action payload to prevent ballooning state memory in audit trail
 */
function sanitizeAuditPayload(payload: any): any {
  if (payload === undefined || payload === null) return undefined;
  if (typeof payload !== 'object') return payload;
  if (Array.isArray(payload)) {
    return { type: 'Array', length: payload.length, sample: payload[0] };
  }
  const summary: Record<string, any> = {};
  for (const [key, val] of Object.entries(payload)) {
    if (Array.isArray(val)) {
      summary[key] = `[Array(${val.length})]`;
    } else if (typeof val === 'string' && val.length > 80) {
      summary[key] = `${val.substring(0, 80)}...`;
    } else if (typeof val === 'object' && val !== null) {
      summary[key] = '[Object]';
    } else {
      summary[key] = val;
    }
  }
  return summary;
}

// Custom Middleware: Audit, throttle, and record dispatched Redux actions
const reduxActionAuditMiddleware: Middleware = (api) => (next) => (action: any) => {
  if (
    !action ||
    typeof action !== 'object' ||
    !action.type ||
    action.type === 'stateMachine/recordReduxAction' ||
    action.type.startsWith('@@redux')
  ) {
    return next(action);
  }

  const now = Date.now();
  const type = action.type;
  let tracker = actionRateMap.get(type);

  if (!tracker || now - tracker.windowStart > ACTION_RATE_WINDOW_MS) {
    tracker = { count: 1, windowStart: now, throttledWarned: false };
    actionRateMap.set(type, tracker);
  } else {
    tracker.count += 1;
  }

  // If rate exceeds critical cap, drop action to prevent browser lockup or infinite loop
  if (tracker.count > CRITICAL_ACTION_CAP) {
    if (!tracker.throttledWarned) {
      tracker.throttledWarned = true;
      logWarn(
        'ReduxRateLimit',
        `Critical rate cap exceeded for action "${type}" (${tracker.count} actions in ${ACTION_RATE_WINDOW_MS}ms). Suppressing further calls.`
      );
    }
    return; // Block the cascading loop action
  }

  const result = next(action);

  // If within throttle limit, record audit trail with lightweight payload summary
  if (tracker.count <= MAX_ACTIONS_PER_WINDOW) {
    try {
      api.dispatch(
        recordReduxAction({
          id: `act-${now}-${Math.random().toString(36).substring(2, 6)}`,
          type: action.type,
          payload: sanitizeAuditPayload(action.payload),
          timestamp: now,
        })
      );
    } catch {
      // Safe fallback
    }
  } else if (!tracker.throttledWarned) {
    tracker.throttledWarned = true;
    logWarn(
      'ReduxRateLimit',
      `Rate cap reached for action "${type}" (${tracker.count} actions). Throttling audit logs.`
    );
  }

  return result;
};

export const store = configureStore({
  reducer: {
    video: videoReducer,
    stateMachine: stateMachineReducer,
    errors: errorsReducer,
    network: networkReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allow Error objects, Response payloads, and raw traces
    }).concat(reduxActionAuditMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

