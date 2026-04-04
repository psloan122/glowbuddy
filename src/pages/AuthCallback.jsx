import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * OAuth callback page. Supabase handles token exchange automatically
 * via the URL hash. This page shows a loading state while the
 * onAuthStateChange listener in App.jsx picks up the new session.
 */
export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // If after 5 seconds we're still here, redirect to home.
    // Normally onAuthStateChange in App.jsx will handle redirect much sooner.
    const timeout = setTimeout(() => {
      navigate('/', { replace: true });
    }, 5000);

    return () => clearTimeout(timeout);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 size={32} className="animate-spin text-rose-accent" />
      <p className="text-sm text-text-secondary">Signing you in...</p>
    </div>
  );
}
