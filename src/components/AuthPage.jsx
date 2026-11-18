import { useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient.js';

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.13 7.13-10.2 7.13-17.58Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.56 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.87l-7.65-5.93c-2.13 1.43-4.86 2.28-8.25 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export default function AuthPage({ mode }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  async function handleGoogleSignIn() {
    if (!supabase) {
      setError('Authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.');
      return;
    }

    setPending(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}app` },
      });

      if (authError) {
        setError(authError.message);
        setPending(false);
      }
    } catch (authError) {
      setError(`Could not start Google sign-in: ${authError.message}`);
      setPending(false);
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand auth-brand" to="/">
        <span className="brand-mark"><Receipt size={20} /></span>receiptly
      </Link>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-heading">
          <span className="auth-badge"><LockKeyhole size={20} /></span>
          <h1 id="auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
          <p>{isRegister ? 'Get started with Receiptly using your Google account.' : 'Sign in to continue to your Receiptly workspace.'}</p>
        </div>
        <button className="google-button" type="button" onClick={handleGoogleSignIn} disabled={pending}>
          <GoogleMark />
          {pending ? 'Connecting to Google…' : isRegister ? 'Sign up with Google' : 'Continue with Google'}
        </button>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-bottom">
          {isRegister ? 'Already have an account?' : 'New to Receiptly?'}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Log in' : 'Create account'} <ArrowRight size={13} />
          </Link>
        </p>
        <p className="auth-secure"><LockKeyhole size={13} /> Secure sign-in powered by Supabase</p>
      </section>
      <Link className="auth-home" to="/"><ArrowLeft size={13} /> Back to Receiptly</Link>
    </main>
  );
}
