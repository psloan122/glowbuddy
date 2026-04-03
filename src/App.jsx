import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, createContext, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { isOnboarded } from './lib/gating';
import { syncLocalPrefsToProfile } from './lib/auth';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';
import Home from './pages/Home';
import Log from './pages/Log';
import ProcedureDetail from './pages/ProcedureDetail';
import ProviderProfile from './pages/ProviderProfile';
import Insights from './pages/Insights';
import Specials from './pages/Specials';
import Community from './pages/Community';
import MyTreatments from './pages/MyTreatments';
import BusinessLanding from './pages/Business/Landing';
import BusinessClaim from './pages/Business/Claim';
import BusinessDashboard from './pages/Business/Dashboard';
import Admin from './pages/Admin';

export const AuthContext = createContext(null);

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth modal state
  const [authModal, setAuthModal] = useState({ open: false, mode: 'signup' });
  const pendingRedirectRef = useRef(null);

  // Post-signup onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Welcome toast
  const [welcomeToast, setWelcomeToast] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        const wasSignedOut = !session;
        const isNowSignedIn = !!newSession;
        setSession(newSession);

        // User just signed in
        if (wasSignedOut && isNowSignedIn) {
          // Close auth modal
          setAuthModal({ open: false, mode: 'signup' });

          // Sync localStorage prefs to profile
          if (newSession.user?.id) {
            syncLocalPrefsToProfile(newSession.user.id);
          }

          // Show onboarding if first time
          if (!isOnboarded()) {
            setShowOnboarding(true);
          } else {
            // Handle pending redirect or show welcome toast
            handlePostAuth();
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [session]);

  function handlePostAuth() {
    if (pendingRedirectRef.current) {
      const redirect = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      navigate(redirect);
    } else {
      // Show welcome toast on browse
      setWelcomeToast(true);
      setTimeout(() => setWelcomeToast(false), 5000);
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    handlePostAuth();
  }

  const openAuthModal = useCallback((mode = 'signup', redirectTo = null) => {
    pendingRedirectRef.current = redirectTo;
    setAuthModal({ open: true, mode });
  }, []);

  const closeAuthModal = useCallback(() => {
    pendingRedirectRef.current = null;
    setAuthModal({ open: false, mode: 'signup' });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-rose-accent text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user || null,
      openAuthModal,
      closeAuthModal,
    }}>
      <div className="min-h-screen bg-warm-white">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/log" element={<Log />} />
            <Route path="/procedure/:slug" element={<ProcedureDetail />} />
            <Route path="/provider/:slug" element={<ProviderProfile />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/specials" element={<Specials />} />
            <Route path="/community" element={<Community />} />
            <Route path="/my-treatments" element={<MyTreatments />} />
            <Route path="/business" element={<BusinessLanding />} />
            <Route path="/business/claim" element={<BusinessClaim />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <footer className="text-center py-8 text-sm text-text-secondary border-t border-gray-100 mt-12">
          <p>&copy; {new Date().getFullYear()} GlowBuddy. All data is crowdsourced and self-reported.</p>
        </footer>

        {/* Auth modal */}
        {authModal.open && (
          <AuthModal mode={authModal.mode} onClose={closeAuthModal} />
        )}

        {/* Post-signup onboarding */}
        {showOnboarding && (
          <Onboarding onComplete={handleOnboardingComplete} />
        )}

        {/* Welcome toast */}
        {welcomeToast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white rounded-xl shadow-lg border border-gray-100 px-6 py-4 flex items-center gap-3 animate-fade-in">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-sm font-medium text-text-primary">Welcome to GlowBuddy!</p>
              <p className="text-xs text-text-secondary">You're all set to log your first treatment.</p>
            </div>
            <button
              onClick={() => setWelcomeToast(false)}
              className="text-text-secondary hover:text-text-primary ml-2"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
