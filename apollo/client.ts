import { useMemo } from 'react';
import {
  ApolloClient,
  ApolloLink,
  InMemoryCache,
  NormalizedCacheObject,
  from,
} from '@apollo/client';
import createUploadLink from 'apollo-upload-client/public/createUploadLink.js';
import { onError } from '@apollo/client/link/error';

import { getJwtToken } from '../libs/auth';
import { socketVar } from './store';
import { sweetErrorAlert } from '../libs/sweetAlert';

let apolloClient: ApolloClient<NormalizedCacheObject> | undefined;

/* ============================ Auth helpers ============================ */
function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const token = getJwtToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/* ================= WS base parsing + URL building (safe) ============== */
function getBrowserWsBase(): string {
  return (
    (process.env.NEXT_PUBLIC_API_WS as string | undefined) ||
    (process.env.REACT_APP_API_WS as string | undefined) ||
    'ws://localhost:4001'
  );
}

function parseWsBase(raw?: string): { origin: string; basePath: string } {
  const rawClean = (raw || 'ws://localhost:4001').trim().replace(/\/+$/, '');
  try {
    const ensured = /^wss?:\/\//i.test(rawClean) ? rawClean : `ws://${rawClean}`;
    const u = new URL(ensured);
    let basePath = (u.pathname || '').replace(/\/+$/, '');
    if (basePath === '/') basePath = '';
    const origin = `${u.protocol}//${u.host}`;
    return { origin, basePath };
  } catch {
    return { origin: 'ws://localhost:4001', basePath: '' };
  }
}

function normPath(p: string): string {
  if (!p) return '';
  const s = '/' + p.replace(/^\/+|\/+$/g, '');
  return s === '/' ? '' : s;
}

function buildWsUrl(origin: string, path: string): string {
  const p = normPath(path);
  return `${origin}${p}`;
}

/* ===================== Native WS init (singleton) ===================== */
let wsInitialized = false;          // hard guard to prevent duplicates
let wsInstance: WebSocket | null = null;

export function initAppWebSocketOnce() {
  if (typeof window === 'undefined') return;
  if (wsInitialized) return;        // already attempted/connected once
  wsInitialized = true;             // mark immediately to block repeat calls

  const token = getJwtToken();
  if (!token) {
    console.warn('[WS] skipped: missing token');
    return;
  }

  const { origin, basePath } = parseWsBase(getBrowserWsBase());

  // Try root first (it’s the only one that opened for you), then env path, then common mounts
  const rawCandidates = ['', basePath, '/ws', '/socket'];
  const seen = new Set<string>();
  const candidates = rawCandidates
    .map((p) => (p === '/' || p == null ? '' : p))
    .filter((p) => {
      const k = p || '__root__';
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

  let connected = false;

  const tryNext = (idx: number) => {
    if (connected || idx >= candidates.length) {
      if (!connected) console.error('[WS] all candidate paths failed');
      return;
    }

    const path = candidates[idx];
    const url = buildWsUrl(origin, path);

    console.log('[WS] attempting', url);

    // Ensure previous instance is closed before new attempt (paranoia)
    try { wsInstance?.close(1000, 'superseded'); } catch {}
    wsInstance = new WebSocket(url);
    socketVar(wsInstance); // expose to the app

    // Safety timeout per attempt (5s)
    const attemptTimeout = window.setTimeout(() => {
      try { wsInstance?.close(4000, 'connect-timeout'); } catch {}
    }, 5000);

    // Start heartbeat only after server sends a frame (avoid unsolicited frames)
    let heart: number | null = null;

    wsInstance.addEventListener('open', () => {
      if (!connected) {
        connected = true;
        clearTimeout(attemptTimeout);
        console.log('[WS] open', url);
      }
      // Send auth token via handshake message — never put tokens in the URL
      try {
        wsInstance?.send(JSON.stringify({ kind: 'auth', token }));
      } catch {}
    });

    wsInstance.addEventListener('message', (e) => {
      // Begin heartbeat after first server frame
      if (!heart) {
        heart = window.setInterval(() => {
          if (wsInstance?.readyState === WebSocket.OPEN) {
            try { wsInstance.send(JSON.stringify({ kind: 'ping' })); } catch {}
          } else if (heart) {
            clearInterval(heart);
            heart = null;
          }
        }, 25000);
      }
      try { console.log('[WS] msg', JSON.parse(e.data)); }
      catch { console.log('[WS] msg', e.data); }
    });

    wsInstance.addEventListener('close', (e) => {
      clearTimeout(attemptTimeout);
      if (heart) { clearInterval(heart); heart = null; }
      console.log('[WS] close', e.code, e.reason);

      if (!connected) {
        // This candidate never reached OPEN; try the next candidate once
        tryNext(idx + 1);
        return;
      }

      // We were connected and then closed (you’re seeing 1005). STOP here.
      // No auto-reconnect to avoid multiplying logs/messages.
      // If you later want to retry manually:
      //   wsInitialized = false; initAppWebSocketOnce();
    });

    wsInstance.addEventListener('error', (e) => {
      console.warn('[WS] error on', path || '/', e);
      // let 'close' decide whether to try the next candidate
    });
  };

  tryNext(0);

  // Allow a clean re-init on hard reload
  window.addEventListener('beforeunload', () => {
    wsInitialized = false;
  }, { once: true });
}

/* ============================== Apollo links ============================== */
const authLink = new ApolloLink((operation, forward) => {
  operation.setContext(({ headers = {} }) => ({
    headers: { ...headers, ...getHeaders() },
  }));
  return forward(operation!);
});

const httpLink = createUploadLink({
  uri:
    process.env.NEXT_PUBLIC_API_GRAPHQL_URL ||
    process.env.REACT_APP_API_GRAPHQL_URL ||
    'http://localhost:4001/graphql',
}) as unknown as ApolloLink;

const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message }) => {
      if (!message?.includes('input')) sweetErrorAlert(message);
    });
  }
  if (networkError) console.log('[Network error]:', networkError);
});

/* ============================ Apollo client init ========================== */
function createApolloClient() {
  if (typeof window !== 'undefined') {
    // Call once after auth is hydrated
    if (getJwtToken()) initAppWebSocketOnce();
  }

  return new ApolloClient({
    ssrMode: typeof window === 'undefined',
    link: from([errorLink, authLink, httpLink]),
    cache: new InMemoryCache(),
    resolvers: {},
  });
}

export function initializeApollo(initialState: any = null) {
  const _apolloClient = apolloClient ?? createApolloClient();
  if (initialState) _apolloClient.cache.restore(initialState);
  if (typeof window === 'undefined') return _apolloClient;
  if (!apolloClient) apolloClient = _apolloClient;
  return _apolloClient;
}

export function useApollo(initialState: any) {
  return useMemo(() => initializeApollo(initialState), [initialState]);
}
