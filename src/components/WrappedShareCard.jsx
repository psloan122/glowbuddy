import { useState, useRef, useEffect, useContext } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

function drawCard(canvas, data) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const ACCENT = '#C94F78';
  const BG = '#1A1A1A';
  const WHITE = '#FFFFFF';
  const DIM = '#9CA3AF';

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, S, S);

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, 'rgba(201, 79, 120, 0.08)');
  grad.addColorStop(1, 'rgba(201, 79, 120, 0.02)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Top: brand
  ctx.fillStyle = ACCENT;
  ctx.font = `bold 42px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`GlowBuddy Wrapped ${data.year}`, S / 2, 110);

  // Decorative line
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(S / 2 - 160, 140);
  ctx.lineTo(S / 2 + 160, 140);
  ctx.stroke();

  // Big stat
  ctx.fillStyle = WHITE;
  ctx.font = `bold 96px ${FONT}`;
  if (data.totalSavings > 100) {
    ctx.fillText(`$${data.totalSavings.toLocaleString()}`, S / 2, 300);
    ctx.fillStyle = DIM;
    ctx.font = `36px ${FONT}`;
    ctx.fillText('saved this year', S / 2, 360);
  } else {
    ctx.fillText(`${data.treatmentsLogged}`, S / 2, 300);
    ctx.fillStyle = DIM;
    ctx.font = `36px ${FONT}`;
    ctx.fillText(`treatment${data.treatmentsLogged !== 1 ? 's' : ''} logged`, S / 2, 360);
  }

  // 2x2 grid
  const gridY = 460;
  const cellW = 420;
  const cellH = 160;
  const gapX = 40;
  const gapY = 30;
  const leftX = S / 2 - cellW - gapX / 2;
  const rightX = S / 2 + gapX / 2;

  const cells = [
    { label: 'Providers', value: `${data.providersVisited}` },
    { label: 'Pioneer Badges', value: `${data.pioneerBadges}` },
    { label: 'Top Procedure', value: data.topProcedure || 'N/A' },
    { label: 'City Rank', value: data.cityRank != null ? `Top ${100 - data.cityRank}%` : 'N/A' },
  ];

  cells.forEach((cell, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = col === 0 ? leftX : rightX;
    const y = gridY + row * (cellH + gapY);

    // Cell background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(x, y, cellW, cellH, 16);
    ctx.fill();

    // Label
    ctx.fillStyle = DIM;
    ctx.font = `24px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(cell.label, x + cellW / 2, y + 50);

    // Value
    ctx.fillStyle = WHITE;
    const isLongText = cell.value.length > 12;
    ctx.font = `bold ${isLongText ? 32 : 44}px ${FONT}`;
    ctx.fillText(cell.value, x + cellW / 2, y + (isLongText ? 105 : 110));
  });

  // Footer
  ctx.fillStyle = DIM;
  ctx.font = `26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('glowbuddy.com \u00B7 Know before you glow.', S / 2, 940);

  if (data.displayName) {
    ctx.fillStyle = ACCENT;
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`@${data.displayName}`, S / 2, 985);
  }
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export default function WrappedShareCard({ data, onClose }) {
  const { user } = useContext(AuthContext);
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    drawCard(canvasRef.current, data);
    setImageUrl(canvasRef.current.toDataURL('image/png'));
    supabase.from('custom_events').insert({
      event_name: 'wrapped_card_generated',
      properties: { year: data.year, user_id: user?.id || null },
    }).then(() => {});
  }, [data]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glowbuddy-wrapped-${data.year}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const file = new File([blob], `glowbuddy-wrapped-${data.year}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          text: `My ${data.year} GlowBuddy Wrapped \u2728 glowbuddy.com`,
          files: [file],
        });
        return;
      } catch {
        // Cancelled — fall through
      }
    }
    handleDownload();
  }

  return (
    <div className="fixed inset-0 z-[80] bg-[#1C1410]/45 flex items-center justify-center p-4">
      <div
        className="bg-white max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        style={{ borderRadius: '8px', border: '1px solid #EDE8E3', borderTop: '3px solid #E8347A' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-ink">Share Your Wrapped</h3>
          {onClose && (
            <button onClick={onClose} className="text-text-secondary hover:text-ink transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {imageUrl && (
          <img src={imageUrl} alt="Wrapped share card" className="w-full rounded-xl mb-4" loading="lazy" />
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
            style={{ backgroundColor: '#C94F78' }}
          >
            <Download size={14} />
            Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[#C94F78] border border-[#C94F78]/30 rounded-xl hover:bg-[#C94F78]/10 transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
