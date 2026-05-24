import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/Avatar';
import { Timer } from '../components/Timer';
import { formatPrice, cn } from '../lib/utils';

export default function ActiveOrder() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [responses, setResponses] = useState([]);
  const [myResponse, setMyResponse] = useState(null);
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  useEffect(() => {
    if (!socket || !session) return;
    socket.emit('join-session', id);

    socket.on('session:item-added', ({ item }) => setItems(prev => [...prev, item]));
    socket.on('session:item-removed', ({ itemId }) => setItems(prev => prev.filter(i => i.id !== itemId)));
    socket.on('session:item-updated', ({ item }) => setItems(prev => prev.map(i => i.id === item.id ? item : i)));
    socket.on('session:response-updated', ({ response }) => {
      setResponses(prev => {
        const idx = prev.findIndex(r => r.user_id === response.user_id);
        if (idx >= 0) return prev.map((r, i) => i === idx ? response : r);
        return [...prev, response];
      });
    });
    socket.on('session:closed', () => navigate(`/sessions/${id}/summary`));

    return () => {
      socket.off('session:item-added');
      socket.off('session:item-removed');
      socket.off('session:item-updated');
      socket.off('session:response-updated');
      socket.off('session:closed');
      socket.emit('leave-session', id);
    };
  }, [socket, session, id]);

  async function loadSession() {
    try {
      const data = await api.getSession(id);
      if (data.session.status === 'setup') {
        navigate(`/sessions/${id}/setup`);
        return;
      }
      if (data.session.status === 'closed') {
        navigate(`/sessions/${id}/summary`);
        return;
      }
      setSession(data.session);
      setItems(data.items);
      setResponses(data.responses);
      setHost(data.host);

      if (data.myResponse) {
        setMyResponse(data.myResponse);
        if (data.myResponse.status === 'declined') {
          setDeclined(true);
          setSubmitted(true);
        } else if (data.myResponse.status === 'responded') {
          setSubmitted(true);
          const qty = {};
          data.myResponse.items?.forEach(i => { qty[i.item_id || i.id] = i.quantity; });
          setQuantities(qty);
          setNotes(data.myResponse.notes || '');
        }
      }
    } catch (e) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  function setQty(itemId, delta) {
    setQuantities(prev => {
      const cur = prev[itemId] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: next };
    });
    setDeclined(false);
    setSubmitted(false);
  }

  const hasSelections = Object.values(quantities).some(q => q > 0);

  async function submitOrder() {
    setSubmitting(true);
    try {
      const orderItems = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([item_id, quantity]) => ({ item_id, quantity }));
      await api.respond(id, { declined: false, items: orderItems, notes });
      setSubmitted(true);
      setDeclined(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDecline() {
    setSubmitting(true);
    try {
      await api.respond(id, { declined: true });
      setDeclined(true);
      setSubmitted(true);
      setQuantities({});
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function closeOrder() {
    if (!confirm('Close the order now?')) return;
    setClosing(true);
    try {
      await api.closeSession(id);
    } catch (e) {
      alert(e.message);
      setClosing(false);
    }
  }

  const respondedCount = responses.filter(r => r.status !== 'pending').length;
  const totalCount = responses.length;
  const isHost = session?.created_by === user?.id;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 safe-top border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-stone-400 text-xl">←</button>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Live Order</h1>
              <p className="text-sm text-stone-500">{host?.username} is ordering</p>
            </div>
          </div>
          {session?.ends_at && (
            <Timer endsAt={session.ends_at} onExpire={() => navigate(`/sessions/${id}/summary`)} />
          )}
        </div>

        {/* Response progress */}
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-stone-100 rounded-full h-2">
            <div
              className="bg-orange-400 h-2 rounded-full transition-all duration-500"
              style={{ width: totalCount ? `${(respondedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <span className="text-xs font-medium text-stone-500">{respondedCount}/{totalCount}</span>
          <div className="flex -space-x-1.5">
            {responses.slice(0, 5).map(r => (
              <div key={r.user_id || r.id} className={cn(
                'ring-2 ring-white rounded-full',
                r.status === 'responded' ? 'ring-green-300' :
                r.status === 'declined' ? 'ring-red-200' : 'ring-stone-200'
              )}>
                <Avatar user={{ username: r.username, avatar_color: r.avatar_color }} size="xs" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 px-5 pt-5 pb-40 overflow-y-auto no-scrollbar">

        {submitted && (
          <div className={cn(
            'rounded-2xl p-4 mb-4 text-center animate-scale-in',
            declined ? 'bg-stone-100' : 'bg-green-50'
          )}>
            <p className="text-2xl mb-1">{declined ? '👋' : '✅'}</p>
            <p className="font-semibold text-stone-800">
              {declined ? "You're sitting this one out" : 'Order submitted!'}
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="text-sm text-orange-500 mt-1 font-medium"
            >
              Edit response
            </button>
          </div>
        )}

        {!submitted && (
          <>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              What do you want?
            </h2>
            <div className="flex flex-col gap-3 mb-4">
              {items.map(item => {
                const qty = quantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between border-2 transition-all',
                      qty > 0 ? 'border-orange-300 bg-orange-50' : 'border-stone-100'
                    )}
                  >
                    <div>
                      <p className="font-semibold text-stone-800">{item.name}</p>
                      {item.price && <p className="text-sm text-stone-500">{formatPrice(item.price)}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {qty > 0 ? (
                        <>
                          <button
                            onClick={() => setQty(item.id, -1)}
                            className="w-9 h-9 bg-white rounded-full border border-stone-200 text-xl font-bold text-stone-700 flex items-center justify-center active:bg-stone-50"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-stone-900">{qty}</span>
                          <button
                            onClick={() => setQty(item.id, 1)}
                            className="w-9 h-9 bg-orange-500 rounded-full text-white text-xl font-bold flex items-center justify-center active:bg-orange-600"
                          >
                            +
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setQty(item.id, 1)}
                          className="w-9 h-9 bg-stone-100 rounded-full text-stone-600 text-xl font-bold flex items-center justify-center active:bg-stone-200"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hasSelections && (
              <div className="mb-4">
                <input
                  className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Any notes? (e.g. no onions)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {/* Who responded */}
        {responses.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Responses</h2>
            <div className="flex flex-col gap-2">
              {responses.map(r => (
                <div key={r.user_id || r.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-stone-100">
                  <Avatar user={{ username: r.username, avatar_color: r.avatar_color }} size="sm" />
                  <span className="flex-1 font-medium text-stone-800 text-sm">{r.username}</span>
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full',
                    r.status === 'responded' ? 'bg-green-100 text-green-700' :
                    r.status === 'declined' ? 'bg-stone-100 text-stone-500' :
                    'bg-yellow-100 text-yellow-700'
                  )}>
                    {r.status === 'responded' ? 'Ordered' :
                     r.status === 'declined' ? 'Not joining' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-stone-100 px-5 py-4 pb-safe space-y-2">
          <Button
            size="lg"
            onClick={submitOrder}
            loading={submitting}
            disabled={!hasSelections}
          >
            Submit Order {hasSelections && `(${Object.values(quantities).reduce((a, b) => a + b, 0)} items)`}
          </Button>
          <Button size="lg" variant="ghost" onClick={submitDecline} disabled={submitting}>
            I don't want anything
          </Button>
        </div>
      )}

      {isHost && session?.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-stone-100 px-5 pt-2 pb-safe">
          {!submitted && <div className="mb-2" />}
          <Button size="lg" variant={submitted ? 'danger' : 'outline'} onClick={closeOrder} loading={closing} className="w-full">
            Close Order Now
          </Button>
        </div>
      )}
    </div>
  );
}
