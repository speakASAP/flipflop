export const AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'https://auth.alfares.cz';
export const CLIENT_ID = 'flipflop';
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

function buildCallbackUrl(nextPath: string): URL {
  const callbackUrl = new URL('/auth/callback', window.location.origin);
  callbackUrl.searchParams.set('next', safeNextPath(nextPath));
  return callbackUrl;
}

export function buildHostedAuthUrl(flow: HostedAuthFlow, redirectPath: string): string {
  if (typeof window === 'undefined') return AUTH_BASE_URL;

  const nextPath = safeNextPath(redirectPath);
  const state = createState(flow);
  window.localStorage.setItem(STATE_KEY, state);
  window.localStorage.setItem(NEXT_KEY, nextPath);

  const authUrl = new URL(`/${flow}`, AUTH_BASE_URL);
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('return_url', buildCallbackUrl(nextPath).toString());
  authUrl.searchParams.set('state', state);
  return authUrl.toString();
}

export function buildHostedPasswordResetUrl(redirectPath: string): string {
  if (typeof window === 'undefined') return `${AUTH_BASE_URL}/reset-password`;

  const resetUrl = new URL('/reset-password', AUTH_BASE_URL);
  resetUrl.searchParams.set('client_id', CLIENT_ID);
  resetUrl.searchParams.set('return_url', buildCallbackUrl(redirectPath).toString());
  return resetUrl.toString();
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
