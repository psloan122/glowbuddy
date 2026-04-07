import { Routes, Route } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
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
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-rose-accent text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null }}>
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
      </div>
    </AuthContext.Provider>
  );
}

export default App;
