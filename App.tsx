import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { Wordmark } from './components/Wordmark';
import { CookieNotice } from './components/SiteChrome';
import { authService, Quota } from './services/auth';
import { SESSION_EXPIRED_EVENT } from './services/http';
import { User } from './types';
import type { AppView } from './components/Header';
import {
  isLegalRoute, migrateLegacyHash, navigate, PageKey, Route, usePageMeta, useRoute,
} from './utils/routes';

// Screens most visitors never open are loaded on demand, so the home page
// only downloads what it shows.
const AuthScreen = lazy(() => import('./components/AuthScreen'));
const Workspace = lazy(() => import('./components/Workspace'));
// In production the policy pages are static HTML (see vite.config.ts). This
// only renders them during `npm run dev`.
const LegalPage = lazy(() => import('./components/legal/LegalPage').then(m => ({ default: m.LegalPage })));

migrateLegacyHash();

interface Session {
  user: User;
  quota: Quota;
}

const toUser = (u: { id: string; email?: string; user_metadata?: { name?: string } }): User => ({
  id: u.id,
  email: u.email || '',
  name: u.user_metadata?.name || undefined,
});

// The signed-in user and their credits, or null when signed out.
const loadSession = async (): Promise<Session | null> => {
  const s = await authService.getSession();
  if (!s?.user) return null;
  return { user: toUser(s.user), quota: await authService.checkQuota() };
};

const LoadingScreen: React.FC = () => (
  <div className="min-h-dvh grid place-items-center p-6" role="status" aria-label="Loading">
    <div className="flex flex-col items-center gap-6">
      <Wordmark className="text-3xl" />
      <span className="block w-40 h-0.5 overflow-hidden rounded-full bg-rule" aria-hidden="true">
        <span className="block h-full w-1/3 bg-brass animate-progress" />
      </span>
    </div>
  </div>
);

export const App: React.FC = () => {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  // Set by a password-reset link; asks the user to choose the new password.
  const [askNewPassword, setAskNewPassword] = useState(false);
  // Why an email link didn't sign the user in; shown on the sign-in screen.
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  // Where to go after signing in, when a signed-out visitor opened /album.
  const returnTo = useRef<Route | null>(null);
  // The forgot-password step of the sign-in page has its own title.
  const [resetStep, setResetStep] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const link = await authService.handleEmailRedirect();
        const s = await loadSession();
        if (link.error && !s) {
          setAuthNotice(link.error);
          navigate('signin', { replace: true });
        }
        if (link.purpose === 'recovery' && s) setAskNewPassword(true);
        setSession(s);
      } catch (err) {
        console.error('Auth init failed', err);
      } finally {
        setIsAuthReady(true);
      }
    })();
  }, []);

  // Signed-in users skip the sign-in pages; signed-out visitors to the album
  // sign in first and then come back to it.
  useEffect(() => {
    if (!isAuthReady) return;
    if (session && (route === 'signin' || route === 'signup')) navigate('home', { replace: true });
    if (!session && route === 'album') {
      returnTo.current = 'album';
      navigate('signin', { replace: true });
    }
  }, [isAuthReady, session, route]);

  const handleSignedOut = useCallback(() => {
    setSession(null);
    setAskNewPassword(false);
    navigate('home', { replace: true });
  }, []);

  // The session can end while the app is open (revoked, or signed out on
  // another device). API calls then return 401; go back to the home page
  // instead of leaving the user in a workspace where nothing works.
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSignedOut);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSignedOut);
  }, [handleSignedOut]);

  const handleAuthSuccess = async () => {
    const s = await loadSession();
    if (!s) return;
    setSession(s);
    setAuthNotice(null);
    navigate(returnTo.current ?? 'home', { replace: true });
    returnTo.current = null;
  };

  const handleUserChange = useCallback((updates: Partial<User>) => {
    setSession(prev => (prev ? { ...prev, user: { ...prev.user, ...updates } } : prev));
  }, []);

  const handleNavigate = useCallback((view: AppView) => navigate(view === 'album' ? 'album' : 'home'), []);

  const pageKey: PageKey = isLegalRoute(route) ? route
    : session ? (route === 'album' ? 'album' : 'workspace')
      : route === 'signin' || route === 'signup' ? (resetStep && route === 'signin' ? 'reset' : route)
        : 'home';
  usePageMeta(pageKey);

  let screen: React.ReactNode;
  if (isLegalRoute(route)) {
    screen = <LegalPage page={route} />;
  } else if (!isAuthReady) {
    screen = <LoadingScreen />;
  } else if (!session) {
    screen = route === 'signin' || route === 'signup'
      ? (
        <AuthScreen
          view={route === 'signup' ? 'signup' : 'login'}
          notice={authNotice}
          onSwitch={(v) => { setAuthNotice(null); navigate(v === 'signup' ? 'signup' : 'signin'); }}
          onResetStep={setResetStep}
          onAuthSuccess={handleAuthSuccess}
          onBack={() => { setAuthNotice(null); navigate('home'); }}
        />
      )
      : <LandingPage />;
  } else {
    screen = (
      <Workspace
        user={session.user}
        initialQuota={session.quota}
        view={route === 'album' ? 'album' : 'restore'}
        onNavigate={handleNavigate}
        onUserChange={handleUserChange}
        onSignOut={handleSignedOut}
        askNewPassword={askNewPassword}
        onNewPasswordDone={() => setAskNewPassword(false)}
      />
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>{screen}</Suspense>
      {!isLegalRoute(route) && <CookieNotice />}
    </>
  );
};
