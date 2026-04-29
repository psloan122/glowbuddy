import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Share2, Sparkles, Plus } from 'lucide-react';
import { AuthContext } from '../App';
import { fetchWrappedData } from '../lib/wrapped';
import WrappedShareCard from '../components/WrappedShareCard';

function useCountUp(target, duration = 1500) {
  const [value, setValue] = useState(0);
  const ref = useRef({ started: false });

  const start = useCallback(() => {
    if (ref.current.started) return;
    ref.current.started = true;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  return { value, start };
}

const SLIDE_TRANSITION = 'transition-all duration-300 ease-out';

export default function Wrapped() {
  const { user, openAuthModal } = useContext(AuthContext);
  const { year: yearParam } = useParams();
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const year = yearParam ? parseInt(yearParam, 10) : currentYear;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideVisible, setSlideVisible] = useState(true);
  const [showShareCard, setShowShareCard] = useState(false);
  const touchRef = useRef({ startX: 0 });

  // Redirect bare /my/wrapped to /my/wrapped/:year
  useEffect(() => {
    if (!yearParam) {
      navigate(`/my/wrapped/${currentYear}`, { replace: true });
    }
  }, [yearParam]);

  useEffect(() => {
    if (!user?.id || !yearParam) return;
    setLoading(true);
    fetchWrappedData(user.id, year).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [user?.id, year]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, data]);

  // Build slides array based on data
  const slides = [];
  if (data?.hasData) {
    slides.push('intro', 'number', 'grid');
    if (data.bestDeal) slides.push('deal');
    if (data.cityRank != null) slides.push('ranking');
    slides.push('share');
  }

  function changeSlide(idx) {
    setSlideVisible(false);
    setTimeout(() => {
      setCurrentSlide(idx);
      setSlideVisible(true);
    }, 150);
  }

  function goNext() {
    if (currentSlide < slides.length - 1) changeSlide(currentSlide + 1);
  }

  function goPrev() {
    if (currentSlide > 0) changeSlide(currentSlide - 1);
  }

  function handleTouchStart(e) {
    touchRef.current.startX = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    const diff = e.changedTouches[0].clientX - touchRef.current.startX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) goNext();
      else goPrev();
    }
  }

  // Auth gate
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Sparkles className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Know Before You Glow Wrapped</h1>
          <p className="text-text-secondary mb-6">
            Sign in to see your personalized year in review.
          </p>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (loading || !yearParam) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1A1A2E] flex items-center justify-center">
        <div className="animate-pulse text-[#C94F78] text-lg">Loading your Wrapped...</div>
      </div>
    );
  }

  // Before December 1 for the current year
  const now = new Date();
  if (year === currentYear && (now.getMonth() < 11)) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Sparkles className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Coming Soon</h1>
          <p className="text-text-secondary mb-4">
            Your {year} Know Before You Glow Wrapped will be ready December 1.
          </p>
          <p className="text-sm text-text-secondary">
            Keep logging treatments to make it even better!
          </p>
        </div>
      </div>
    );
  }

  // No data
  if (!data?.hasData) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Sparkles className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">{year} Wrapped</h1>
          <p className="text-text-secondary mb-6">
            You haven&apos;t shared any prices in {year} yet. Share your first to unlock your Wrapped!
          </p>
          <Link
            to="/log"
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            <Plus size={16} />
            Share a price
          </Link>
        </div>
      </div>
    );
  }

  const slideKey = slides[currentSlide];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#1A1A2E] flex flex-col select-none"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={goNext}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pt-4 pb-2 px-4">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); changeSlide(i); }}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-8 bg-[#C94F78]' : i < currentSlide ? 'w-4 bg-[#C94F78]/50' : 'w-4 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Slide content */}
        <div className={`flex-1 flex items-center justify-center px-6 ${SLIDE_TRANSITION} ${
          slideVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}>
          {slideKey === 'intro' && <IntroSlide year={year} />}
          {slideKey === 'number' && <NumberSlide data={data} visible={slideVisible} />}
          {slideKey === 'grid' && <GridSlide data={data} />}
          {slideKey === 'deal' && <DealSlide data={data} />}
          {slideKey === 'ranking' && <RankingSlide data={data} />}
          {slideKey === 'share' && (
            <ShareSlide
              data={data}
              onShare={(e) => { e.stopPropagation(); setShowShareCard(true); }}
            />
          )}
        </div>

        {/* Nav arrows */}
        <div className="flex justify-between items-center px-6 pb-6">
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className={`p-2 rounded-full text-white/60 hover:text-white transition-colors ${
              currentSlide === 0 ? 'invisible' : ''
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/'); }}
            className="text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            Exit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className={`p-2 rounded-full text-white/60 hover:text-white transition-colors ${
              currentSlide === slides.length - 1 ? 'invisible' : ''
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {showShareCard && (
        <WrappedShareCard data={data} onClose={() => setShowShareCard(false)} />
      )}
    </>
  );
}

// ── Slide Components ──

function IntroSlide({ year }) {
  return (
    <div className="text-center max-w-sm">
      <div className="text-6xl mb-6">&#10024;</div>
      <h1 className="text-4xl font-bold text-white mb-3">
        Your {year}
      </h1>
      <p className="text-5xl font-bold text-[#C94F78] mb-6">
        Glow Wrapped
      </p>
      <p className="text-white/50 text-sm">
        Tap to see your year in review
      </p>
    </div>
  );
}

function NumberSlide({ data, visible }) {
  const showSavings = data.totalSavings > 100;
  const target = showSavings ? data.totalSavings : data.treatmentsLogged;
  const { value, start } = useCountUp(target);

  useEffect(() => {
    if (visible) start();
  }, [visible, start]);

  return (
    <div className="text-center">
      <p className="text-white/50 text-sm uppercase tracking-widest mb-4">
        {showSavings ? 'You saved' : 'You logged'}
      </p>
      <p className="text-7xl font-bold text-white mb-2">
        {showSavings ? `$${value.toLocaleString()}` : value}
      </p>
      <p className="text-xl text-[#C94F78]">
        {showSavings ? 'below average pricing' : `treatment${data.treatmentsLogged !== 1 ? 's' : ''} this year`}
      </p>
    </div>
  );
}

function GridSlide({ data }) {
  const items = [
    { label: 'Treatments', value: data.treatmentsLogged },
    { label: 'Providers', value: data.providersVisited },
    { label: 'Pioneer Badges', value: data.pioneerBadges },
    { label: 'Cities', value: data.citiesExplored },
    { label: 'Top Procedure', value: data.topProcedure, small: true },
    { label: 'Favorite Provider', value: data.favoriteProvider, small: true },
  ];

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-xl font-bold text-white text-center mb-6">Your Year in Glow</h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-white/50 text-xs mb-1">{item.label}</p>
            <p className={`font-bold text-white ${item.small ? 'text-sm' : 'text-2xl'}`}>
              {item.value || 0}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DealSlide({ data }) {
  const deal = data.bestDeal;
  if (!deal) return null;

  return (
    <div className="text-center max-w-sm">
      <p className="text-white/50 text-sm uppercase tracking-widest mb-4">Best Deal</p>
      <p className="text-3xl font-bold text-white mb-2">{deal.procedureType}</p>
      <p className="text-white/70 mb-4">at {deal.providerName}</p>
      <p className="text-5xl font-bold text-[#C94F78] mb-2">
        ${deal.pricePaid.toLocaleString()}
      </p>
      <div className="inline-block bg-[#C94F78]/20 rounded-full px-4 py-1.5">
        <p className="text-sm font-medium text-[#C94F78]">
          {deal.pctBelow}% below average &middot; Saved ${deal.savings.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function RankingSlide({ data }) {
  const topPct = data.cityRank != null ? 100 - data.cityRank : null;

  return (
    <div className="text-center max-w-sm">
      <p className="text-white/50 text-sm uppercase tracking-widest mb-4">
        {data.city} Rankings
      </p>
      {topPct != null && (
        <>
          <p className="text-7xl font-bold text-white mb-2">Top {topPct}%</p>
          <p className="text-white/70 mb-8">
            of beauty shoppers in {data.city}, {data.state}
          </p>
        </>
      )}
      {data.funStat && (
        <div className="bg-white/[0.06] rounded-xl p-5 mt-4">
          <p className="text-white/50 text-xs mb-1">Your savings could buy</p>
          <p className="text-3xl font-bold text-[#C94F78]">
            {data.funStat.value} {data.funStat.label}
          </p>
        </div>
      )}
    </div>
  );
}

function ShareSlide({ data, onShare }) {
  return (
    <div className="text-center max-w-sm">
      <div className="text-5xl mb-4">&#127881;</div>
      <h2 className="text-2xl font-bold text-white mb-2">That's a Wrap!</h2>
      <p className="text-white/60 mb-8">
        Share your {data.year} glow journey with friends
      </p>
      <button
        onClick={onShare}
        className="inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium text-white rounded-xl transition-colors"
        style={{ backgroundColor: '#C94F78' }}
      >
        <Share2 size={18} />
        Share My Wrapped
      </button>
    </div>
  );
}
