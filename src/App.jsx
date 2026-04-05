import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, createContext, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { isOnboarded } from './lib/gating';
import { syncLocalPrefsToProfile, claimPendingSubmission } from './lib/auth';
import { checkAndAwardBadges } from './lib/badgeLogic';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';
import Toast from './components/Toast';
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
import BusinessOnboarding from './pages/Business/Onboarding';
import Admin from './pages/Admin';
import MapView from './pages/MapView';
import Alerts from './pages/Alerts';
import Verified from './pages/Verified';
import AuthCallback from './pages/AuthCallback';
import ResetPassword from './pages/ResetPassword';
import GuideDetail from './pages/GuideDetail';
import GoalDetail from './pages/GoalDetail';
import InjectorProfile from './pages/InjectorProfile';
import InjectorFeed from './pages/InjectorFeed';
import InjectorClaim from './pages/InjectorClaim';
import DealShare from './pages/DealShare';
import BudgetPlanner from './pages/BudgetPlanner';
import StackBuilder from './pages/StackBuilder';
import RoutineQuiz from './pages/RoutineQuiz';
import SoftVerifyBanner from './components/SoftVerifyBanner';
import { syncToSupabase, loadFromSupabase } from './lib/firstTimerMode';

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

  // Toast system
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

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

          const userId = newSession.user?.id;

          // Sync localStorage prefs to profile
          if (userId) {
            syncLocalPrefsToProfile(userId);
            syncToSupabase(userId);
            loadFromSupabase(userId);
          }

          // Claim any pending submission from the log form
          if (userId) {
            claimPendingSubmission(userId).then(async (claimedId) => {
              if (claimedId) {
                // Award badges for the new submission
                await checkAndAwardBadges(userId);
                // Navigate to my-treatments and show toast
                navigate('/my-treatments');
                showToast('Your submission is now live! Welcome to GlowBuddy.');
                return;
              }

              // Check for pending action in sessionStorage
              const pendingAction = sessionStorage.getItem('gb_pending_action');
              if (pendingAction) {
                sessionStorage.removeItem('gb_pending_action');
                try {
                  const action = JSON.parse(pendingAction);
                  if (action.path) {
                    navigate(action.path);
                    showToast('Welcome back!');
                    return;
                  }
                } catch {
                  // Invalid JSON — ignore
                }
              }

              // No pending submission or action — normal post-auth flow
              if (!isOnboarded()) {
                setShowOnboarding(true);
              } else {
                handlePostAuth();
              }
            });
          } else {
            // No user id — normal flow
            if (!isOnboarded()) {
              setShowOnboarding(true);
            } else {
              handlePostAuth();
            }
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
      showToast('Welcome back!');
    } else {
      showToast('Welcome to GlowBuddy!');
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
      showToast,
    }}>
      <div className="min-h-screen bg-warm-white">
        <Navbar />
        <SoftVerifyBanner />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/log" element={<Log />} />
            <Route path="/procedure/:slug" element={<ProcedureDetail />} />
            <Route path="/provider/:slug" element={<ProviderProfile />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/specials" element={<Specials />} />
            <Route path="/community" element={<Community />} />
            <Route path="/my-treatments" element={<MyTreatments />} />
            <Route path="/budget" element={<BudgetPlanner />} />
            <Route path="/business" element={<BusinessLanding />} />
            <Route path="/business/claim" element={<BusinessClaim />} />
            <Route path="/business/onboarding" element={<BusinessOnboarding />} />
            <Route path="/business/dashboard" element={<BusinessDashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/verified" element={<Verified />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/guides/:slug" element={<GuideDetail />} />
            <Route path="/goals/:slug" element={<GoalDetail />} />
            <Route path="/injectors/:slugOrId" element={<InjectorProfile />} />
            <Route path="/injectors/:slugOrId/claim" element={<InjectorClaim />} />
            <Route path="/following" element={<InjectorFeed />} />
            <Route path="/deal" element={<DealShare />} />
            <Route path="/my-stack" element={<StackBuilder />} />
            <Route path="/build-my-routine" element={<RoutineQuiz />} />
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

        {/* Toast notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={clearToast}
          />
        )}
      </div>
    </AuthContext.Provider>
  );
}

export default App;
