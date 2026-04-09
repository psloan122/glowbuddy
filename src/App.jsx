import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, createContext, useCallback, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { isOnboarded, syncProcedureTagsToSupabase } from './lib/gating';
import { syncLocalPrefsToProfile, syncProfileToLocal, claimPendingSubmission } from './lib/auth';
import { checkAndAwardBadges } from './lib/badgeLogic';

import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import Onboarding from './components/Onboarding';
import ScrollToTop from './components/ScrollToTop';
import Toast from './components/Toast';
import Home from './pages/Home';
import SoftVerifyBanner from './components/SoftVerifyBanner';
import BusinessContextBar from './components/BusinessContextBar';
import MobileBottomNav from './components/MobileBottomNav';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import RouteErrorFallback from './components/RouteErrorFallback';
import { syncToSupabase, loadFromSupabase } from './lib/firstTimerMode';
import { captureReferralFromUrl, createReferralOnSignup } from './lib/referral';

// Lazy-loaded pages — only downloaded when the user navigates to them
const Log = lazy(() => import('./pages/Log'));
const ProcedureDetail = lazy(() => import('./pages/ProcedureDetail'));
const ProviderProfile = lazy(() => import('./pages/ProviderProfile'));
const Insights = lazy(() => import('./pages/Insights'));
const Specials = lazy(() => import('./pages/Specials'));
const Community = lazy(() => import('./pages/Community'));
const MyTreatments = lazy(() => import('./pages/MyTreatments'));
const BusinessLanding = lazy(() => import('./pages/Business/Landing'));
const BusinessClaim = lazy(() => import('./pages/Business/Claim'));
const BusinessDashboard = lazy(() => import('./pages/Business/Dashboard'));
const BusinessOnboarding = lazy(() => import('./pages/Business/Onboarding'));
const BusinessAddBusiness = lazy(() => import('./pages/Business/AddBusiness'));
const Admin = lazy(() => import('./pages/Admin'));
const Rewards = lazy(() => import('./pages/Rewards'));
const FindPrices = lazy(() => import('./pages/FindPrices'));
const Alerts = lazy(() => import('./pages/Alerts'));
const Verified = lazy(() => import('./pages/Verified'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const AuthConfirm = lazy(() => import('./pages/AuthConfirm'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const GuideDetail = lazy(() => import('./pages/GuideDetail'));
const GuideIndex = lazy(() => import('./pages/GuideIndex'));
const ProcedureGuide = lazy(() => import('./pages/ProcedureGuide'));
const GoalDetail = lazy(() => import('./pages/GoalDetail'));
const InjectorProfile = lazy(() => import('./pages/InjectorProfile'));
const InjectorFeed = lazy(() => import('./pages/InjectorFeed'));
const InjectorClaim = lazy(() => import('./pages/InjectorClaim'));
const DealShare = lazy(() => import('./pages/DealShare'));
const BudgetPlanner = lazy(() => import('./pages/BudgetPlanner'));
const StackBuilder = lazy(() => import('./pages/StackBuilder'));
const RoutineQuiz = lazy(() => import('./pages/RoutineQuiz'));
const ResolveDispute = lazy(() => import('./pages/ResolveDispute'));
const Settings = lazy(() => import('./pages/Settings'));
const Account = lazy(() => import('./pages/Account'));
const TreatmentTimeline = lazy(() => import('./pages/TreatmentTimeline'));
const CalculatorPage = lazy(() => import('./pages/Calculator'));
const CityPriceIndex = lazy(() => import('./pages/CityPriceIndex'));
const CityPriceReport = lazy(() => import('./pages/CityPriceReport'));
const Refer = lazy(() => import('./pages/Refer'));
const Wrapped = lazy(() => import('./pages/Wrapped'));
const ReferralRedirect = lazy(() => import('./pages/ReferralRedirect'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const About = lazy(() => import('./pages/About'));
const Audit = lazy(() => import('./pages/Audit'));
const RequestBid = lazy(() => import('./pages/RequestBid'));
const MyBidRequests = lazy(() => import('./pages/MyBidRequests'));
const ViewBids = lazy(() => import('./pages/ViewBids'));
const BusinessBidRequests = lazy(() => import('./pages/Business/BidRequests'));
const BusinessSubmitBid = lazy(() => import('./pages/Business/SubmitBid'));
const BusinessMyBids = lazy(() => import('./pages/Business/MyBids'));
const AdminPendingCharges = lazy(() => import('./pages/Admin/PendingCharges'));
const AdminWaitlist = lazy(() => import('./pages/Admin/Waitlist'));
const GlowFund = lazy(() => import('./pages/GlowFund'));
const NotFound = lazy(() => import('./pages/NotFound'));

export const AuthContext = createContext(null);

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth modal state
  const [authModal, setAuthModal] = useState({ open: false, mode: 'signup' });
  const pendingRedirectRef = useRef(null);

  // Track session in a ref so the onAuthStateChange closure always has the current value
  const sessionRef = useRef(null);

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

  // Capture ?ref= param on app load
  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionRef.current = session;
      setSession(session);
      setLoading(false);
      // Check login streak for existing sessions


    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // Use ref for current session so this closure never goes stale
        const wasSignedOut = !sessionRef.current;
        const isNowSignedIn = !!newSession;

        // Update ref immediately
        sessionRef.current = newSession;

        // Force React re-render on USER_UPDATED (e.g. email verified)
        // so SoftVerifyBanner and isEmailVerified checks update app-wide
        if (event === 'USER_UPDATED' && newSession) {
          setSession({ ...newSession });
        } else {
          setSession(newSession);
        }

        // User just signed in
        if (wasSignedOut && isNowSignedIn) {
          // Close auth modal
          setAuthModal({ open: false, mode: 'signup' });

          const userId = newSession.user?.id;

          // Sync localStorage prefs to/from profile
          if (userId) {
            syncProfileToLocal(userId).catch(() => {});
            syncLocalPrefsToProfile(userId).catch(() => {});
            syncProcedureTagsToSupabase(userId, supabase).catch(() => {});
            syncToSupabase(userId).catch(() => {});
            loadFromSupabase(userId).catch(() => {});
            // Create referral record if user signed up via referral link
            createReferralOnSignup(userId).catch(() => {});
          }

          // Claim any pending submission from the log form
          if (userId) {
            claimPendingSubmission(userId).then(async (claimedId) => {
              if (claimedId) {
                // Award badges for the new submission
                await checkAndAwardBadges(userId);
                // Navigate to my-treatments and show toast
                navigate('/my-treatments');
                showToast('Your submission is now live! Welcome to Know Before You Glow.');
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

              // If user signed up from a /business page, stay there
              if (window.location.pathname.startsWith('/business')) {
                showToast('Welcome to Know Before You Glow!');
                return;
              }

              // No pending submission or action — normal post-auth flow
              if (!isOnboarded()) {
                setShowOnboarding(true);
              } else {
                handlePostAuth();
              }
            }).catch(() => {
              // If anything in the chain fails, don't leave user stuck
              handlePostAuth();
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePostAuth() {
    if (pendingRedirectRef.current) {
      const redirect = pendingRedirectRef.current;
      pendingRedirectRef.current = null;
      navigate(redirect);
      showToast('Welcome back!');
    } else {
      showToast('Welcome to Know Before You Glow!');
    }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    navigate('/account?welcome=true');
    showToast('Welcome to Know Before You Glow!');
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
        <ScrollToTop />
        <Navbar />
        <SoftVerifyBanner />
        <BusinessContextBar />
        <main id="main-content" className="pb-[80px] md:pb-0">
          {/* Per-route ErrorBoundary — a single page crash (e.g. a stale
              chunk hash on /business after a deploy, a malformed prop, a
              third-party SDK throwing) should fall back to an inline
              "this section broke" message inside the app shell, NOT the
              full-page "Oops" that nukes Navbar/Footer/auth state. The
              root boundary in main.jsx still catches anything that
              escapes this one. */}
          <ErrorBoundary
            label="route"
            fallback={({ error, reset }) => (
              <RouteErrorFallback error={error} reset={reset} />
            )}
          >
            <Suspense fallback={
              <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C94F78', fontSize: '14px' }}>
                Loading...
              </div>
            }>
              <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<FindPrices />} />
              <Route path="/log" element={<Log />} />
              <Route path="/procedure/:slug" element={<ProcedureDetail />} />
              <Route path="/provider/:slug" element={<ProviderProfile />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/specials" element={<Specials />} />
              <Route path="/community" element={<Community />} />
              <Route path="/my-treatments" element={<MyTreatments />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/budget" element={<BudgetPlanner />} />
              <Route path="/business" element={<BusinessLanding />} />
              <Route path="/business/claim" element={<BusinessClaim />} />
              <Route path="/business/onboarding" element={<BusinessOnboarding />} />
              <Route path="/business/add" element={<BusinessAddBusiness />} />
              <Route path="/business/dashboard" element={<BusinessDashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/verified" element={<Verified />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/guides" element={<GuideIndex />} />
              <Route path="/guides/:slug" element={<GuideDetail />} />
              <Route path="/guide/:slug" element={<ProcedureGuide />} />
              {/* Friendly alias — "Glossary of Terms" is the user-facing
                  name for the same content. Keeps /guides as the canonical
                  URL so existing links and SEO don't break. */}
              <Route path="/glossary" element={<Navigate to="/guides" replace />} />
              <Route path="/glossary/:slug" element={<Navigate to="/guides" replace />} />
              <Route path="/goals/:slug" element={<GoalDetail />} />
              <Route path="/injectors/:slugOrId" element={<InjectorProfile />} />
              <Route path="/injectors/:slugOrId/claim" element={<InjectorClaim />} />
              <Route path="/following" element={<InjectorFeed />} />
              <Route path="/deal" element={<DealShare />} />
              <Route path="/my-stack" element={<StackBuilder />} />
              <Route path="/build-my-routine" element={<RoutineQuiz />} />
              <Route path="/resolve-dispute" element={<ResolveDispute />} />
              <Route path="/account" element={<Account />} />
              <Route path="/settings" element={<Navigate to="/account" replace />} />
              <Route path="/my/history" element={<TreatmentTimeline />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/refer" element={<Refer />} />
              <Route path="/r/:code" element={<ReferralRedirect />} />
              <Route path="/my/wrapped" element={<Wrapped />} />
              <Route path="/my/wrapped/:year" element={<Wrapped />} />
              <Route path="/prices" element={<CityPriceIndex />} />
              <Route path="/prices/:citySlug" element={<CityPriceReport />} />
              <Route path="/prices/:citySlug/:yearMonth" element={<CityPriceReport />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/pending-charges" element={<AdminPendingCharges />} />
              <Route path="/admin/waitlist" element={<AdminWaitlist />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/request-bid" element={<RequestBid />} />
              <Route path="/my-requests" element={<MyBidRequests />} />
              <Route path="/my-requests/:requestId" element={<ViewBids />} />
              <Route path="/business/bid-requests" element={<BusinessBidRequests />} />
              <Route path="/business/bid-requests/:requestId/bid" element={<BusinessSubmitBid />} />
              <Route path="/business/my-bids" element={<BusinessMyBids />} />
              <Route path="/glow-fund" element={<GlowFund />} />
              <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />

        {/* Mobile bottom nav */}
        <MobileBottomNav />

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
