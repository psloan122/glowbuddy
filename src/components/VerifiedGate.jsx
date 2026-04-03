import { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import VerifyEmailModal from './VerifyEmailModal';

export default function VerifiedGate({ children, action = 'do this' }) {
  const { user, openAuthModal } = useContext(AuthContext);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  function handleClick(e) {
    if (!user) {
      e.preventDefault();
      e.stopPropagation();
      openAuthModal('signup');
      return;
    }

    if (!isEmailVerified(user)) {
      e.preventDefault();
      e.stopPropagation();
      setShowVerifyModal(true);
      return;
    }

    // User is authed + verified — let the action proceed normally
  }

  return (
    <>
      <div onClick={handleClick}>
        {children}
      </div>
      {showVerifyModal && (
        <VerifyEmailModal
          action={action}
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </>
  );
}
