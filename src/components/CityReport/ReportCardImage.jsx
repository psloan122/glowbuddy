import { useState, useRef, useEffect } from 'react';
import { Download, Share2 } from 'lucide-react';

function drawCard(canvas, { city, state, topProcedure, avgPrice, submissions, month }) {
  const W = 1200;
  const H = 630;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#FDF6F0');
  grad.addColorStop(1, '#FBE8EF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = 'rgba(201, 79, 120, 0.15)';
  ctx.lineWidth = 3;
  ctx.roundRect(16, 16, W - 32, H - 32, 24);
  ctx.stroke();

  // Brand
  ctx.fillStyle = '#C94F78';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('\u2728 Know Before You Glow', 60, 70);

  // City title
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${city}, ${state}`, W / 2, 170);

  // Subtitle
  ctx.fillStyle = '#6B7280';
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`Monthly Price Report \u2014 ${month}`, W / 2, 215);

  // Top procedure + price
  if (topProcedure && avgPrice) {
    ctx.fillStyle = '#C94F78';
    ctx.font = 'bold 56px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`$${avgPrice.toLocaleString()} avg`, W / 2, 340);

    ctx.fillStyle = '#374151';
    ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`for ${topProcedure}`, W / 2, 385);
  }

  // Submissions — covers both patient submissions and provider menu prices,
  // so use a neutral label rather than implying everything is patient-reported.
  ctx.fillStyle = '#1A1A1A';
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${submissions} real prices tracked`, W / 2, 470);

  // Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('Compare real cosmetic prices at knowbeforeyouglow.com', W / 2, 570);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

export default function ReportCardImage({ city, state, topProcedure, avgPrice, submissions, month }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    drawCard(canvasRef.current, { city, state, topProcedure, avgPrice, submissions, month });
    setImageUrl(canvasRef.current.toDataURL('image/png'));
  }, [city, state, topProcedure, avgPrice, submissions, month]);

  async function handleDownload() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glowbuddy-${city.toLowerCase()}-${state.toLowerCase()}-prices.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!canvasRef.current) return;
    const blob = await canvasToBlob(canvasRef.current);
    const file = new File([blob], `glowbuddy-${city.toLowerCase()}-prices.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          text: `Check out real cosmetic prices in ${city}, ${state} on Know Before You Glow!`,
          files: [file],
        });
        return;
      } catch {
        // Cancelled — fall through to download
      }
    }
    handleDownload();
  }

  return (
    <div className="glow-card p-5">
      <h3 className="text-lg font-bold text-text-primary mb-3">Share This Report</h3>
      <canvas ref={canvasRef} className="hidden" />
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${city}, ${state} price report card`}
          className="w-full rounded-xl border border-gray-100 mb-4"
          loading="lazy"
        />
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
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-xl hover:bg-rose-light/50 transition-colors"
        >
          <Share2 size={14} />
          Share
        </button>
      </div>
    </div>
  );
}
