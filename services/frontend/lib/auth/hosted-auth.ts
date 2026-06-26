const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.alfares.cz';
const CLIENT_ID = 'flipflop';
const STATE_KEY = 'flipflop_auth_state';
const NEXT_KEY = 'flipflop_auth_next';

export type HostedAuthFlow = 'login' | 'register';

function safeNextPath(value: string | null | undefined): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/';
}

function createState(flow: HostedAuthFlow): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${CLIENT_ID}:${flow}:${random}`;
}

export function getRedirectPathFromLocation(): string {
  if (typeof window === 'undefined') return '/';
  const params = new URLSearchParams(window.location.search);
  return safeNextPath(params.get('redirect') || params.get('next'));
}

export function buildHostedAuthUrl(flow: HostedAuthFlow, redirectPath: string): string {
  if (typeof window === 'undefined') return AUTH_BASE_URL;

  const nextPath = safeNextPath(redirectPath);
  const state = createState(flow);
  window.localStorage.setItem(STATE_KEY, state);
  window.localStorage.setItem(NEXT_KEY, nextPath);

  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', nextPath);

  const authUrl = new URL(`/${flow}`, AUTH_BASE_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('return_url', callbackUrl.toString());
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

export function redirectToHostedAuth(flow: HostedAuthFlow, redirectPath: string): void {
  window.location.assign(buildHostedAuthUrl(flow, redirectPath));
}

export function consumeExpectedAuthState(): string | null {
  if (typeof window === 'undefined') return null;
  const state = window.localStorage.getItem(STATE_KEY);
  window.localStorage.removeItem(STATE_KEY);
  return state;
}

export function consumeStoredNextPath(fallback: string): string {
  if (typeof window === 'undefined') return safeNextPath(fallback);
  const stored = window.localStorage.getItem(NEXT_KEY);
  window.localStorage.removeItem(NEXT_KEY);
  return safeNextPath(stored || fallback);
}

export function isTrustedServerInitiatedState(state: string | null): boolean {
  return Boolean(state?.startsWith('guest-checkout:'));
}
