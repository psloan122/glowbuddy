import { useState } from 'react';

export default function AddExperienceSheet({ procedure, onClose }) {
  const [painLevel, setPainLevel] = useState(null);
  const [surprise, setSurprise] = useState('');
  const [wishKnown, setWishKnown] = useState('');
  const [wouldGoAlone, setWouldGoAlone] = useState(null);
  const [recovery, setRecovery] = useState(null);

  return (
    <div style={{ padding: 24 }}>
      <h3>Share Your Experience</h3>
      <p>{procedure?.displayName}</p>
      {/* Pain level 1-5 */}
      {/* What surprised you */}
      {/* What do you wish you'd known */}
      {/* Would you go alone: Yes / No / Depends */}
      {/* Recovery: Easier / About right / Harder */}
      <button onClick={onClose}>Submit</button>
    </div>
  );
}
