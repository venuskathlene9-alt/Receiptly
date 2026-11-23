import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CircleHelp, LogOut } from 'lucide-react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getProfile } from './services/expenseService.js';
import { supabase } from './services/supabaseClient.js';
import AuthPage from './components/AuthPage.jsx';
import LandingPage from './components/LandingPage.jsx';
import Workspace from './components/Workspace.jsx';
function App() {
  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const toastTimer = useRef(null);
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 3800);
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) showToast(`Could not check your sign-in: ${error.message}`, 'error');
        setSession(data.session);
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        showToast(`Could not check your sign-in: ${error.message}`, 'error');
        setAuthLoading(false);
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [showToast]);

  useEffect(() => {
    if (!session?.user?.id) {
      setProfile(null);
      return undefined;
    }

    let active = true;
    getProfile(session.user.id)
      .then((nextProfile) => { if (active) setProfile(nextProfile); })
      .catch((error) => showToast(`Could not load your workspace: ${error.message}`, 'error'));
    return () => { active = false; };
  }, [session?.user?.id, showToast]);

  function onProfileUpdate(next) { setProfile(next); }

  async function handleSignOut() {
    if (!window.confirm('Are you sure you want to log out?')) return;
    const { error } = await supabase.auth.signOut();
    if (error) showToast(`Could not sign out: ${error.message}`, 'error');
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/setup" element={<Navigate to="/register" replace />} />
        <Route path="/login" element={authLoading ? <AuthLoading /> : session ? <Navigate to="/app" replace /> : <AuthPage mode="login" />} />
        <Route path="/register" element={authLoading ? <AuthLoading /> : session ? <Navigate to="/app" replace /> : <AuthPage mode="register" />} />
        <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
        <Route path="/app/*" element={authLoading ? <AuthLoading /> : session ? <Workspace userId={session.user.id} userEmail={session.user.email} profile={profile} onProfileUpdate={onProfileUpdate} onSignOut={handleSignOut} toast={showToast} /> : <Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.type === 'success' ? <Check size={17} /> : <CircleHelp size={17} />}{toast.message}</div>}
    </>
  );
}

function AuthLoading() {
  return <main className="auth-page"><span className="loader" aria-label="Checking your sign-in" /></main>;
}

export default App;
