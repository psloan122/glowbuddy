import { useState, useContext } from 'react';
import { Upload, Loader2, Check, X, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';

const UNIT_LABELS = {
  per_unit: '/unit',
  per_syringe: '/syringe',
  per_vial: '/vial',
  per_session: '/session',
  per_area: '/area',
  per_cycle: '/cycle',
  flat_package: 'pkg',
};

function StagingRow({ item, onConfirm, onRemove }) {
  const conf = item.confidence ?? 0;
  const confColor = conf >= 0.9 ? '#059669' : conf >= 0.7 ? '#D97706' : '#DC2626';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid #F0F0F0',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            fontWeight: 600,
            color: '#111',
            margin: 0,
          }}
        >
          {((n) => !n ? 'Treatment' : n.includes('/') ? 'Neurotoxin' : n)(item.procedure_type)}
        </p>
        {item.notes && (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: '#888',
              margin: '2px 0 0',
            }}
          >
            {item.notes}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 900,
          fontSize: 18,
          color: '#111',
          whiteSpace: 'nowrap',
        }}
      >
        ${item.price}
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: 11,
            color: '#888',
            marginLeft: 2,
          }}
        >
          {UNIT_LABELS[item.price_label] || ''}
        </span>
      </span>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: confColor,
          flexShrink: 0,
        }}
        title={`${Math.round(conf * 100)}% confidence`}
      />
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!item.is_confirmed && (
          <button
            type="button"
            onClick={() => onConfirm(item)}
            style={{
              width: 28,
              height: 28,
              border: '1px solid #059669',
              borderRadius: 4,
              background: 'white',
              color: '#059669',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Confirm this price"
          >
            <Check size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => onRemove(item)}
          style={{
            width: 28,
            height: 28,
            border: '1px solid #DDD',
            borderRadius: 4,
            background: 'white',
            color: '#999',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Remove"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

export default function MenuUploader({ providerId }) {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  async function handleUpload() {
    if (!file || !providerId) return;
    setError('');
    setStatus('uploading');

    try {
      const path = `${providerId}/${Date.now()}_${file.name}`;
      const { error: storageErr } = await supabase.storage
        .from('provider-menus')
        .upload(path, file);

      if (storageErr) {
        setError('Upload failed: ' + storageErr.message);
        setStatus('idle');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('provider-menus')
        .getPublicUrl(path);

      const { data: menu, error: menuErr } = await supabase
        .from('provider_menus')
        .insert({
          provider_id: providerId,
          file_url: urlData.publicUrl,
          file_type: file.type.includes('pdf') ? 'pdf' : 'image',
          uploaded_by: user?.id || null,
        })
        .select()
        .single();

      if (menuErr) {
        setError('Could not create menu record');
        setStatus('idle');
        return;
      }

      setStatus('parsing');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-menu`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            menu_id: menu.id,
            provider_id: providerId,
            file_url: urlData.publicUrl,
          }),
        },
      );

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || 'Parse failed');
        setStatus('idle');
        return;
      }

      setItems(result.items || []);
      setStatus('done');
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setStatus('idle');
    }
  }

  async function confirmItem(item) {
    await supabase
      .from('menu_items_staging')
      .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
      .eq('id', item.id);
    setItems((prev) =>
      prev.map((i) => (i === item ? { ...i, is_confirmed: true } : i)),
    );
  }

  async function removeItem(item) {
    if (item.id) {
      await supabase.from('menu_items_staging').delete().eq('id', item.id);
    }
    setItems((prev) => prev.filter((i) => i !== item));
  }

  async function confirmAllAndPush() {
    setConfirming(true);
    try {
      const unconfirmed = items.filter((i) => !i.is_confirmed);
      if (unconfirmed.length > 0) {
        const ids = unconfirmed.map((i) => i.id).filter(Boolean);
        if (ids.length > 0) {
          await supabase
            .from('menu_items_staging')
            .update({ is_confirmed: true, confirmed_at: new Date().toISOString() })
            .in('id', ids);
        }
      }

      // Push confirmed items to provider_pricing
      const pricingRows = items.map((item) => ({
        provider_id: providerId,
        procedure_type: item.procedure_type,
        price: item.price,
        price_label: item.price_label,
        confidence_tier: 2,
        source: 'business_menu',
        notes: item.notes || null,
        is_starting_price: false,
      }));

      if (pricingRows.length > 0) {
        await supabase.from('provider_pricing').insert(pricingRows);
      }

      setItems((prev) => prev.map((i) => ({ ...i, is_confirmed: true })));
    } catch (err) {
      setError('Could not save prices: ' + (err.message || err));
    } finally {
      setConfirming(false);
    }
  }

  const allConfirmed = items.length > 0 && items.every((i) => i.is_confirmed);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 600,
            color: '#111',
            marginBottom: 4,
          }}
        >
          Upload your price menu
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: '#888',
            fontWeight: 300,
          }}
        >
          PDF, JPG, or PNG. We'll extract your prices automatically.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 16px',
            border: '1px dashed #DDD',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: '#666',
          }}
        >
          <Upload size={14} />
          {file ? file.name : 'Choose file'}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || status === 'uploading' || status === 'parsing'}
          style={{
            padding: '10px 20px',
            borderRadius: 2,
            border: 'none',
            background: !file || status !== 'idle' ? '#EEE' : '#E8347A',
            color: !file || status !== 'idle' ? '#999' : '#fff',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: !file || status !== 'idle' ? 'not-allowed' : 'pointer',
          }}
        >
          {status === 'idle' && 'Upload & Parse'}
          {status === 'uploading' && 'Uploading...'}
          {status === 'parsing' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={12} className="animate-spin" /> Extracting prices...
            </span>
          )}
          {status === 'done' && 'Done'}
        </button>
      </div>

      {error && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#DC2626', marginBottom: 12 }}>
          {error}
        </p>
      )}

      {items.length > 0 && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: '#111',
              marginBottom: 8,
            }}
          >
            {items.length} price{items.length !== 1 ? 's' : ''} extracted
          </p>
          {items.map((item, i) => (
            <StagingRow
              key={item.id || i}
              item={item}
              onConfirm={confirmItem}
              onRemove={removeItem}
            />
          ))}
          {!allConfirmed && (
            <button
              type="button"
              onClick={confirmAllAndPush}
              disabled={confirming}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '12px 0',
                borderRadius: 2,
                border: 'none',
                background: confirming ? '#EEE' : '#111',
                color: confirming ? '#999' : '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: confirming ? 'not-allowed' : 'pointer',
              }}
            >
              {confirming ? 'Saving...' : 'Confirm all & add to listing'}
            </button>
          )}
          {allConfirmed && (
            <p
              style={{
                marginTop: 12,
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: '#059669',
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              All prices confirmed and added to your listing.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
