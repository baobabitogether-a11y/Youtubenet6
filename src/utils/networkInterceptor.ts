import { store } from '../store';
import {
  recordRequestStart,
  recordRequestComplete,
  recordRequestFailed,
} from '../store/networkSlice';
import { addError } from '../store/errorsSlice';
import { logNetwork, logError } from './logBuffer';

let isInterceptorInitialized = false;

/**
 * Manually record any network or timedtext request
 */
export function trackNetworkRequest(
  url: string,
  method: string,
  type: 'fetch' | 'xhr' | 'timedtext_interception' | 'translation_api',
  requestHeaders?: Record<string, string>,
  requestBody?: any
) {
  const id = `manual-net-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const startTime = Date.now();
  store.dispatch(
    recordRequestStart({
      id,
      url,
      method,
      type,
      requestHeaders,
      requestBody,
    })
  );
  return {
    id,
    complete: (status: number, responseBody?: any, headers?: Record<string, string>) => {
      const duration = Date.now() - startTime;
      store.dispatch(
        recordRequestComplete({
          id,
          status,
          responseBody,
          responseHeaders: headers,
          duration,
        })
      );
      logNetwork({
        category: type,
        url,
        method,
        status,
        duration,
        responseBody,
        message: `${method} ${url} completed (${status})`,
      });
    },
    fail: (error: string) => {
      const duration = Date.now() - startTime;
      store.dispatch(
        recordRequestFailed({
          id,
          error,
          duration,
        })
      );
      logNetwork({
        category: type,
        url,
        method,
        status: 0,
        duration,
        message: `${method} ${url} failed: ${error}`,
      });
    },
  };
}

export function initGlobalNetworkAndErrorInterceptors() {
  if (isInterceptorInitialized || typeof window === 'undefined') {
    return;
  }
  isInterceptorInitialized = true;

  // Filter benign Vite websocket connection notices in dev environment
  try {
    const origConsoleError = window.console.error;
    window.console.error = function (...args: any[]) {
      const first = typeof args[0] === 'string' ? args[0] : '';
      const full = args.map((a) => String(a?.message || a || '')).join(' ');
      if (
        first === '[vite]' ||
        first.includes('[vite]') ||
        full.includes('failed to connect to websocket') ||
        full.includes('vite-plugin-pwa:dev-ready')
      ) {
        if (window.console.debug) {
          window.console.debug('[vite-filtered]', ...args);
        }
        return;
      }
      return origConsoleError.apply(window.console, args);
    };
  } catch {}

  // ============================================================================
  // 1. GLOBAL FETCH INTERCEPTION (Safe against read-only getter properties)
  // ============================================================================
  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;

    if (originalFetch) {
      const patchedFetch = async function (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> {
        const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;
        const method = (
          init?.method ||
          (typeof input === 'object' && 'method' in input ? input.method : 'GET') ||
          'GET'
        ).toUpperCase();
        const startTime = Date.now();

        // Categorize request type
        let reqType: 'fetch' | 'timedtext_interception' | 'translation_api' | 'xhr' = 'fetch';
        if (url.includes('timedtext')) {
          reqType = 'timedtext_interception';
        } else if (
          url.includes('translate') ||
          url.includes('/api/youtube-timedtext-translate')
        ) {
          reqType = 'translation_api';
        }

        let parsedBody: any = undefined;
        try {
          if (init?.body && typeof init.body === 'string') {
            try {
              parsedBody = JSON.parse(init.body);
            } catch {
              parsedBody = init.body;
            }
          }
        } catch {}

        const reqHeaders: Record<string, string> = {};
        if (init?.headers) {
          try {
            if (init.headers instanceof Headers) {
              init.headers.forEach((v, k) => {
                reqHeaders[k] = v;
              });
            } else if (Array.isArray(init.headers)) {
              init.headers.forEach(([k, v]) => {
                reqHeaders[k] = v;
              });
            } else {
              Object.assign(reqHeaders, init.headers);
            }
          } catch {}
        }

        store.dispatch(
          recordRequestStart({
            id,
            url,
            method,
            type: reqType,
            requestHeaders: reqHeaders,
            requestBody: parsedBody,
          })
        );

        try {
          const response = await originalFetch(input, init);
          const duration = Date.now() - startTime;

          // Safely clone response to inspect body without consuming the stream
          let responseBody: any = null;
          const resHeaders: Record<string, string> = {};

          try {
            const cloned = response.clone();
            cloned.headers.forEach((v, k) => {
              resHeaders[k] = v;
            });

            try {
              const text = await cloned.text();
              try {
                responseBody = JSON.parse(text);
              } catch {
                responseBody = text;
              }
            } catch {
              responseBody = '[Binary or Unreadable Body]';
            }
          } catch {
            responseBody = '[Clone unavailable]';
          }

          store.dispatch(
            recordRequestComplete({
              id,
              status: response.status,
              statusText: response.statusText,
              responseHeaders: resHeaders,
              responseBody,
              duration,
            })
          );

          logNetwork({
            category: reqType,
            url,
            method,
            status: response.status,
            duration,
            responseBody,
            message: `${method} ${url} completed (${response.status})`,
          });

          // If HTTP error status (4xx or 5xx), log to errors slice
          if (!response.ok) {
            store.dispatch(
              addError({
                section: 'network',
                title: `HTTP ${response.status} (${method} ${new URL(url, window.location.origin).pathname})`,
                message:
                  typeof responseBody === 'object' && responseBody?.error
                    ? responseBody.error
                    : `Request failed with status ${response.status} ${response.statusText}`,
                details: {
                  url,
                  method,
                  status: response.status,
                  duration: `${duration}ms`,
                  responseBody,
                },
              })
            );
          }

          return response;
        } catch (err: any) {
          const duration = Date.now() - startTime;
          const errorMsg = err?.message || 'Network fetch failed or blocked';

          store.dispatch(
            recordRequestFailed({
              id,
              error: errorMsg,
              duration,
            })
          );

          store.dispatch(
            addError({
              section: 'network',
              title: `Network Failure (${method} ${url})`,
              message: errorMsg,
              details: { url, method, error: String(err), duration: `${duration}ms` },
              stack: err?.stack,
            })
          );

          throw err;
        }
      };

      // Safely apply patched fetch without throwing on read-only/getter properties
      try {
        Object.defineProperty(window, 'fetch', {
          value: patchedFetch,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (defineError) {
        try {
          Object.defineProperty(Window.prototype, 'fetch', {
            value: patchedFetch,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch (protoError) {
          try {
            (window as any).fetch = patchedFetch;
          } catch (assignError) {
            console.warn(
              '[NetworkInterceptor] Could not patch window.fetch (environment restrictions):',
              assignError
            );
          }
        }
      }
    }
  } catch (outerFetchErr) {
    console.warn('[NetworkInterceptor] Setup error for fetch interceptor:', outerFetchErr);
  }

  // ============================================================================
  // 2. GLOBAL XHR INTERCEPTION
  // ============================================================================
  try {
    if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      const originalXhrSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        method: string,
        url: string | URL,
        ...rest: any[]
      ) {
        (this as any).__network_id = `xhr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        (this as any).__network_method = method;
        (this as any).__network_url = typeof url === 'string' ? url : url.toString();
        (this as any).__network_start = Date.now();
        return originalXhrOpen.apply(this, [method, url as any, ...rest] as any);
      };

      XMLHttpRequest.prototype.send = function (body?: any) {
        const id = (this as any).__network_id;
        const url = (this as any).__network_url || '';
        const method = ((this as any).__network_method || 'GET').toUpperCase();
        const startTime = (this as any).__network_start || Date.now();

        if (id && url) {
          store.dispatch(
            recordRequestStart({
              id,
              url,
              method,
              type: 'xhr',
              requestBody: typeof body === 'string' ? body : undefined,
            })
          );

          this.addEventListener('load', () => {
            const duration = Date.now() - startTime;
            let respBody: any = null;
            try {
              respBody =
                typeof this.response === 'string'
                  ? this.response
                  : (this.responseText || '[Binary/Object]');
            } catch {}

            store.dispatch(
              recordRequestComplete({
                id,
                status: this.status,
                statusText: this.statusText,
                responseBody: respBody,
                duration,
              })
            );

            logNetwork({
              category: 'xhr',
              url,
              method,
              status: this.status,
              duration,
              responseBody: respBody,
              message: `XHR ${method} ${url} completed (${this.status})`,
            });

            if (this.status >= 400) {
              store.dispatch(
                addError({
                  section: 'network',
                  title: `XHR HTTP ${this.status} (${method} ${url})`,
                  message: `XHR failed with status ${this.status}`,
                  details: { url, method, status: this.status, duration: `${duration}ms` },
                })
              );
            }
          });

          this.addEventListener('error', () => {
            const duration = Date.now() - startTime;
            store.dispatch(
              recordRequestFailed({
                id,
                error: 'XHR Network Error',
                duration,
              })
            );
          });
        }

        return originalXhrSend.apply(this, [body] as any);
      };
    }
  } catch (xhrErr) {
    console.warn('[NetworkInterceptor] Setup error for XHR interceptor:', xhrErr);
  }

  // ============================================================================
  // 3. GLOBAL SYSTEM RUNTIME ERROR LISTENERS
  // ============================================================================
  try {
    window.addEventListener('error', (event) => {
      // Ignore benign Vite websocket or resize observer notices
      if (
        event.message?.includes('ResizeObserver') ||
        event.message?.includes('failed to connect to websocket') ||
        event.message?.includes('[vite]')
      ) {
        return;
      }
      store.dispatch(
        addError({
          section: 'system',
          title: 'Unhandled Window Error',
          message: event.message || 'Unknown runtime error',
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          },
          stack: event.error?.stack,
        })
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const message = reason?.message || String(reason || 'Unhandled Promise Rejection');
      if (
        message.includes('failed to connect to websocket') ||
        message.includes('[vite]')
      ) {
        return;
      }
      store.dispatch(
        addError({
          section: 'system',
          title: 'Unhandled Promise Rejection',
          message,
          details: typeof reason === 'object' ? reason : { raw: String(reason) },
          stack: reason?.stack,
        })
      );
    });
  } catch (listenerErr) {
    console.warn('[NetworkInterceptor] Setup error for error listeners:', listenerErr);
  }
}
