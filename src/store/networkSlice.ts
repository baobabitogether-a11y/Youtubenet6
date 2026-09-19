import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NetworkRequestRecord } from './types';
import { MAX_RESPONSE_BODY_LOG_CHARS } from '../utils/logBuffer';

function truncateLogBody(body: any): any {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'string') {
    if (body.length > MAX_RESPONSE_BODY_LOG_CHARS) {
      return `${body.substring(0, MAX_RESPONSE_BODY_LOG_CHARS)}... [truncated ${body.length - MAX_RESPONSE_BODY_LOG_CHARS} chars]`;
    }
    return body;
  }
  try {
    const jsonStr = JSON.stringify(body);
    if (jsonStr.length > MAX_RESPONSE_BODY_LOG_CHARS) {
      return `${jsonStr.substring(0, MAX_RESPONSE_BODY_LOG_CHARS)}... [truncated ${jsonStr.length - MAX_RESPONSE_BODY_LOG_CHARS} chars]`;
    }
    return body;
  } catch {
    return '[Non-serializable body]';
  }
}

interface NetworkSliceState {
  requests: NetworkRequestRecord[];
  filterType: 'all' | 'timedtext' | 'api' | 'translation' | 'failed' | 'success';
  excludeErrors: boolean;
  searchQuery: string;
  selectedRequestId: string | null;
  isInspectorOpen: boolean;
}

const initialState: NetworkSliceState = {
  requests: [],
  filterType: 'all',
  excludeErrors: false,
  searchQuery: '',
  selectedRequestId: null,
  isInspectorOpen: false,
};

export const networkSlice = createSlice({
  name: 'network',
  initialState,
  reducers: {
    recordRequestStart: (
      state,
      action: PayloadAction<{
        id: string;
        url: string;
        method: string;
        type: 'fetch' | 'xhr' | 'timedtext_interception' | 'translation_api';
        requestHeaders?: Record<string, string>;
        requestBody?: any;
      }>
    ) => {
      const newRecord: NetworkRequestRecord = {
        id: action.payload.id,
        url: action.payload.url,
        method: action.payload.method,
        type: action.payload.type,
        startTime: Date.now(),
        requestHeaders: action.payload.requestHeaders,
        requestBody: truncateLogBody(action.payload.requestBody),
        isPending: true,
      };
      state.requests.unshift(newRecord);
      if (state.requests.length > 60) {
        state.requests.pop();
      }
    },
    recordRequestComplete: (
      state,
      action: PayloadAction<{
        id: string;
        status: number;
        statusText?: string;
        responseHeaders?: Record<string, string>;
        responseBody?: any;
        duration?: number;
      }>
    ) => {
      const req = state.requests.find((r) => r.id === action.payload.id);
      if (req) {
        req.status = action.payload.status;
        req.statusText = action.payload.statusText;
        req.responseHeaders = action.payload.responseHeaders;
        req.responseBody = truncateLogBody(action.payload.responseBody);
        req.duration = action.payload.duration ?? (Date.now() - req.startTime);
        req.isPending = false;
      }
    },
    recordRequestFailed: (
      state,
      action: PayloadAction<{
        id: string;
        error: string;
        duration?: number;
      }>
    ) => {
      const req = state.requests.find((r) => r.id === action.payload.id);
      if (req) {
        req.error = action.payload.error;
        req.duration = action.payload.duration ?? (Date.now() - req.startTime);
        req.isPending = false;
        req.status = req.status || 0;
      }
    },
    clearNetworkLogs: (state) => {
      state.requests = [];
      state.selectedRequestId = null;
    },
    setFilterType: (
      state,
      action: PayloadAction<'all' | 'timedtext' | 'api' | 'translation' | 'failed' | 'success'>
    ) => {
      state.filterType = action.payload;
    },
    setExcludeErrors: (state, action: PayloadAction<boolean>) => {
      state.excludeErrors = action.payload;
    },
    toggleExcludeErrors: (state) => {
      state.excludeErrors = !state.excludeErrors;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedRequestId: (state, action: PayloadAction<string | null>) => {
      state.selectedRequestId = action.payload;
    },
    setNetworkInspectorOpen: (state, action: PayloadAction<boolean>) => {
      state.isInspectorOpen = action.payload;
    },
    toggleNetworkInspectorOpen: (state) => {
      state.isInspectorOpen = !state.isInspectorOpen;
    },
  },
});

export const {
  recordRequestStart,
  recordRequestComplete,
  recordRequestFailed,
  clearNetworkLogs,
  setFilterType,
  setExcludeErrors,
  toggleExcludeErrors,
  setSearchQuery,
  setSelectedRequestId,
  setNetworkInspectorOpen,
  toggleNetworkInspectorOpen,
} = networkSlice.actions;

export default networkSlice.reducer;
