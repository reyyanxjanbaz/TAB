import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../lib/utils';

export default function OrderSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getSummary(id)
      .then(setData)
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  function buildSummaryText() {
    if (!data) return '';
    const lines = [`📋 TAB Order Summary\n`];
    if (data.itemTotals.length) {
      lines.push('📦 Items:');
      data.itemTotals.forEach(i => {
        lines.push(`  • ${i.name} × ${i.total_qty}${i.price ? ` (${formatPrice(i.price)} each)` : ''}`);
      });
      lines.push('');
    }
    const ordered = data.responses.filter(r => r.status === 'responded');
    if (ordered.length) {
      lines.push('🧑‍🤝‍🧑 Who ordered what:');
      ordered.forEach(r => {
        const itemStr = r.items.map(i => `${i.name}×${i.quantity}`).join(', ');
        lines.push(`  ${r.username}: ${itemStr}${r.notes ? ` (${r.notes})` : ''}`);
      });
      lines.push('');
    }
    if (data.declined.length) {
      lines.push(`👋 Not joining: ${data.declined.map(r => r.username).join(', ')}`);
    }
    return lines.join('\n');
  }

  function copySummary() {
    navigator.clipboard.writeText(buildSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareSummary() {
    if (navigator.share) {
      navigator.share({ title: 'TAB Order Summary', text: buildSummaryText() });
    } else {
      copySummary();
    }
  }

  if (loading) {
    return <div className="h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!data) return null;
  const groupId = data?.session?.group_id;
  const { session, itemTotals, responses, declined, pending } = data;
  const ordered = responses.filter(r => r.status === 'responded');
  const grandTotal = itemTotals.reduce((sum, i) => sum + (i.price || 0) * i.total_qty, 0);

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 safe-top border-b border-stone-100 text-center">
        <button onClick={() => navigate(`/groups/${groupId}`)} className="absolute left-5 top-12 text-stone-400 text-xl">←</button>
        <div className="text-5xl mb-2">🎉</div>
        <h1 className="text-2xl font-black text-stone-900">Order Closed</h1>
        <p className="text-stone-500 text-sm mt-1">
          {ordered.length} ordered · {declined.length} declined{pending > 0 ? ` · ${pending} no response` : ''}
        </p>
      </div>

      <div className="flex-1 px-5 pt-5 pb-4 overflow-y-auto no-scrollbar">

        {/* Item totals */}
        {itemTotals.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Total Items</h2>
            <div className="bg-white rounded-2xl overflow-hidden border border-stone-100">
              {itemTotals.map((item, i) => (
                <div key={item.id} className={`flex items-center justify-between px-4 py-3.5 ${i < itemTotals.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-xl flex items-center justify-center font-bold text-orange-500">
                      {item.total_qty}
                    </div>
                    <span className="font-medium text-stone-800">{item.name}</span>
                  </div>
                  {item.price && (
                    <span className="text-stone-500 text-sm">{formatPrice(item.price * item.total_qty)}</span>
                  )}
                </div>
              ))}
              {grandTotal > 0 && (
                <div className="flex items-center justify-between px-4 py-3.5 bg-stone-50 border-t border-stone-100">
                  <span className="font-bold text-stone-800">Total</span>
                  <span className="font-bold text-orange-500">{formatPrice(grandTotal)}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Who ordered what */}
        {ordered.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Who Ordered What</h2>
            <div className="flex flex-col gap-3">
              {ordered.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-stone-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Avatar user={{ username: r.username, avatar_color: r.avatar_color }} size="sm" />
                    <span className="font-semibold text-stone-800">{r.username}</span>
                  </div>
                  <div className="ml-12 space-y-1">
                    {r.items.map(i => (
                      <div key={i.item_id} className="flex items-center justify-between text-sm">
                        <span className="text-stone-600">{i.name} × {i.quantity}</span>
                        {i.price && <span className="text-stone-400">{formatPrice(i.price * i.quantity)}</span>}
                      </div>
                    ))}
                    {r.notes && <p className="text-xs text-stone-400 italic mt-1">Note: {r.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Declined */}
        {declined.length > 0 && (
          <section className="mb-5">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Not Joining</h2>
            <div className="flex flex-wrap gap-2">
              {declined.map(r => (
                <div key={r.id} className="flex items-center gap-2 bg-white border border-stone-100 rounded-full px-3 py-2">
                  <Avatar user={{ username: r.username, avatar_color: r.avatar_color }} size="xs" />
                  <span className="text-sm text-stone-600">{r.username}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-stone-100 px-5 py-4 pb-safe space-y-2">
        <div className="flex gap-3">
          <Button onClick={shareSummary} className="flex-1">
            Share Summary
          </Button>
          <Button onClick={copySummary} variant="outline" className="flex-1">
            {copied ? '✓ Copied!' : 'Copy Text'}
          </Button>
        </div>
        <Button variant="ghost" size="md" onClick={() => navigate(`/groups/${groupId}`)} className="w-full text-stone-500">
          ← Back to Group
        </Button>
      </div>
    </div>
  );
}
