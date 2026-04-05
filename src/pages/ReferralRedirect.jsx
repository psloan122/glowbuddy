import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * Handles /r/:code — stores referral code in localStorage and redirects to home.
 */
export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem('gb_ref', code);
    }
    navigate('/', { replace: true });
  }, [code, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-rose-accent text-lg">Redirecting...</div>
    </div>
  );
}
