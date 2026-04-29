import { useState, useRef, useEffect, useContext } from 'react';
import { Download, Copy, Share2, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

/**
 * Draws the 1080×1080 savings share card onto a canvas and returns a Blob.
 */
function drawCard(canvas, {
  procedureType,
  pricePerUnit,
  unitLabel,
  city,
  yearlySavings,
  percentile,
  paidBelow,
}) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d');

  // ── Background gradient ──
  const grad = ctx.createLinearGradient(0, 0, S, S);
  grad.addColorStop(0, '#FDF6F0');
  grad.addColorStop(1, '#FBE8EF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);

  // Subtle border
  ctx.strokeStyle = 'rgba(201, 79, 120, 0.15)';
  ctx.lineWidth = 4;
  ctx.roundRect(20, 20, S - 40, S - 40, 32);
  ctx.stroke();

  // ── Top sparkle + brand ──
  ctx.fillStyle = '#C94F78';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('\u2728 Know Before You Glow', 80, 120);

  // ── Main price line ──
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`I pay $${pricePerUnit}${unitLabel} for ${procedureType}`, S / 2, 300);

  // City
  ctx.fillStyle = '#6B7280';
  ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`in ${city}`, S / 2, 370);

  // ── Savings / Overpay ──
  if (paidBelow && yearlySavings > 0) {
    ctx.fillStyle = '#C94F78';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`$${Math.round(yearlySavings).toLocaleString()}/year LESS`, S / 2, 520);

    ctx.fillStyle = '#6B7280';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('than the average', S / 2, 580);
  } else if (!paidBelow && yearlySavings > 0) {
    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`$${Math.round(yearlySavings).toLocaleString()}/year MORE`, S / 2, 520);

    ctx.fillStyle = '#6B7280';
    ctx.font = '36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('than the average', S / 2, 580);
  } else {
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 72px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText('Right at average', S / 2, 520);
  }

  // ── Percentile ──
  if (percentile != null && paidBelow) {
    const topPct = Math.round(100 - percentile);
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 40px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`Top ${topPct}% of prices in my city \u{1F3C5}`, S / 2, 700);
  }

  // ── Footer ──
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Find real prices at knowbeforeyouglow.com', S / 2, 920);
  ctx.fillText('Know before you glow. \u2728', S / 2, 965);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function trackEvent(eventName, properties = {}) {
  supabase.from('custom_events').insert({ event_name: eventName, properties }).then(() => {});
}

export default function SavingsShareCard({
  procedureType,
  pricePerUnit,
  unitLabel = '',
  city,
  yearlySavings = 0,
  percentile = null,
  paidBelow = true,
  onClose,
}) {
  const { user } = useContext(AuthContext);
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [captionCopied, setCaptionCopied] = useState(false);

  const savingsDirection = paidBelow ? 'saving' : 'overpaying';
  const caption = `Found real ${procedureType} prices in ${city} using @glowbuddy \u2014 I'm ${savingsDirection} $${Math.round(yearlySavings)}/yr vs the average \u{1F489}\u2728 knowbeforeyouglow.com`;

  useEffect(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, {
      procedureType,
      pricePerUnit,
      unitLabel,
      city,
      yearlySavings,
      percentile,
      paidBelow,
    });
    const url = canvasRef.current.toDataURL('image/png');
    setImageUrl(url);
    trackEvent('savings_card_generated', {
      procedure_type: procedureType,
      city,
      user_id: user?.id || null,
    });
  }, [procedureType, pricePerUnit, unitLabel, city, yearlySavings, percentile, paidBelow]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glowbuddy-savings-${procedureType.toLowerCase().replace(/\s+/g, '-')}.png`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent('savings_card_downloaded', {
      procedure_type: procedureType,
      city,
      user_id: user?.id || null,
    });
  }

  async function handleShare() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const file = new File([blob], 'glowbuddy-savings.png', { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          text: caption,
          files: [file],
        });
        trackEvent('savings_card_shared', {
          procedure_type: procedureType,
          city,
          user_id: user?.id || null,
        });
        return;
      } catch {
        // Cancelled or failed — fall through
      }
    }

    // Fallback: download
    handleDownload();
  }

  function handleCopyCaption() {
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">Share Your Savings</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Hidden canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Preview */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Savings share card"
            className="w-full rounded-xl border border-gray-100 mb-4"
            loading="lazy"
          />
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mb-4">
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
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-xl hover:bg-rose-light/50 transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
        </div>

        {/* Caption */}
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-text-secondary mb-2 font-medium">Suggested caption:</p>
          <p className="text-sm text-text-primary mb-2.5 leading-relaxed">{caption}</p>
          <button
            onClick={handleCopyCaption}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-accent hover:text-rose-dark transition-colors"
          >
            {captionCopied ? (
              <><Check size={12} /> Copied!</>
            ) : (
              <><Copy size={12} /> Copy Caption</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
