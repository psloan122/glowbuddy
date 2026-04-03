import { useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { AuthContext } from '../App';

export default function Verified() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'Email Verified | GlowBuddy';
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 pt-24 text-center">
      <div className="glow-card p-8">
        <div className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-6" style={{ backgroundColor: '#E1F5EE' }}>
          <CheckCircle size={32} style={{ color: '#0F6E56' }} />
        </div>

        <h1 className="text-2xl font-bold text-text-primary mb-2">
          Email verified!
        </h1>

        <p className="text-text-secondary mb-8">
          You now have full access to GlowBuddy.
          {user?.email && (
            <>
              <br />
              <span className="text-sm font-medium text-text-primary">{user.email}</span>
            </>
          )}
        </p>

        <Link
          to="/log"
          className="inline-block w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition text-center"
          style={{ backgroundColor: '#C94F78' }}
        >
          Log your first treatment &rarr;
        </Link>

        <Link
          to="/"
          className="block mt-3 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          Browse prices
        </Link>
      </div>
    </div>
  );
}
