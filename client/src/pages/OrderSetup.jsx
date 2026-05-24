import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { formatPrice } from '../lib/utils';

const TIMERS = [
  { label: '1 min', seconds: 60 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: 'No limit', seconds: null },
];

const QUICK_ITEMS = ['Burger', 'Fries', 'Pizza', 'Shawarma', 'Coffee', 'Tea', 'Juice', 'Sandwich', 'Salad', 'Wrap'];

export default function OrderSetup() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timer, setTimer] = useState(300);
  const [customTimer, setCustomTimer] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  useEffect(() => {
    loadSession();
  }, [id]);

  async function loadSession() {
    try {
      const { session, items } = await api.getSession(id);
      if (session.created_by !== user.id) {
        navigate(`/sessions/${id}`);
        return;
      }
      if (session.status !== 'setup') {
        navigate(session.status === 'active' ? `/sessions/${id}` : `/sessions/${id}/summary`);
        return;
      }
      setSession(session);
      setItems(items);
    } catch (e) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function addItem(name, price) {
    if (!name.trim()) return;
    setAddingItem(true);
    try {
      const { item } = await api.addItem(id, { name: name.trim(), price: price ? parseFloat(price) : null });
      setItems(prev => [...prev, item]);
      setItemName('');
      setItemPrice('');
      setShowAddItem(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setAddingItem(false);
    }
  }

  async function removeItem(itemId) {
    try {
      await api.deleteItem(id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) {
      alert(e.message);
    }
  }

  async function startOrder() {
    if (!items.length) return alert('Add at least one item');
    if (showCustom) {
      const mins = parseInt(customTimer);
      if (!mins || mins < 1 || mins > 120) return alert('Enter a timer between 1 and 120 minutes');
    }
    setStarting(true);
    try {
      const duration = showCustom ? parseInt(customTimer) * 60 : timer;
      await api.startSession(id, { timer_duration: duration });
      navigate(`/sessions/${id}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return <div className="h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 safe-top border-b border-stone-100 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-stone-400 text-xl p-1">←</button>
          <div>
            <h1 className="text-xl font-bold text-stone-900">Setup Order</h1>
            <p className="text-sm text-stone-500">Add items for your group</p>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-5 pb-4 overflow-y-auto no-scrollbar">

        {/* Quick add */}
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Quick Add</h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {QUICK_ITEMS.map(name => (
            <button
              key={name}
              onClick={() => addItem(name, '')}
              disabled={items.some(i => i.name === name)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                items.some(i => i.name === name)
                  ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-300'
                  : 'bg-white text-stone-700 border border-stone-200 active:bg-stone-50'
              }`}
            >
              {items.some(i => i.name === name) ? `✓ ${name}` : name}
            </button>
          ))}
          <button
            onClick={() => setShowAddItem(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-orange-500 text-white"
          >
            + Custom
          </button>
        </div>

        {/* Items list */}
        {items.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Menu ({items.length} items)
            </h2>
            <div className="flex flex-col gap-2 mb-5">
              {items.map(item => (
                <div key={item.id} className="bg-white rounded-2xl px-4 py-3 flex items-center justify-between border border-stone-100 animate-slide-up">
                  <div>
                    <p className="font-medium text-stone-800">{item.name}</p>
                    {item.price && <p className="text-sm text-stone-500">{formatPrice(item.price)}</p>}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 active:bg-stone-100 text-lg"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 text-stone-400">
            <div className="text-4xl mb-2">🛒</div>
            <p className="text-sm">Pick items from above or add custom ones</p>
          </div>
        )}

        {/* Timer */}
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Timer</h2>
        <div className="grid grid-cols-4 gap-2">
          {TIMERS.map(t => (
            <button
              key={t.label}
              onClick={() => { setTimer(t.seconds); setShowCustom(false); }}
              className={`py-3 rounded-2xl text-sm font-semibold transition-all ${
                timer === t.seconds && !showCustom
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-stone-700 border border-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`mt-2 w-full py-3 rounded-2xl text-sm font-semibold border ${showCustom ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-700 border-stone-200'}`}
        >
          Custom timer
        </button>
        {showCustom && (
          <div className="mt-2">
            <Input
              type="number"
              placeholder="Minutes (e.g. 15)"
              value={customTimer}
              onChange={e => setCustomTimer(e.target.value)}
              min="1" max="60"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-stone-100 px-5 py-4 pb-safe">
        <Button
          size="lg"
          onClick={startOrder}
          loading={starting}
          disabled={items.length === 0}
        >
          🚀 Start Order — Notify Group
        </Button>
      </div>

      {/* Custom item modal */}
      <Modal open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Item">
        <form
          onSubmit={e => { e.preventDefault(); addItem(itemName, itemPrice); }}
          className="flex flex-col gap-4 pt-3"
        >
          <Input
            label="Item name"
            placeholder="e.g. Chicken Burger"
            value={itemName}
            onChange={e => setItemName(e.target.value)}
            autoFocus
          />
          <Input
            label="Price (optional)"
            type="number"
            placeholder="0.00"
            value={itemPrice}
            onChange={e => setItemPrice(e.target.value)}
            prefix="$"
            step="0.01"
            min="0"
          />
          <Button type="submit" size="lg" loading={addingItem} disabled={!itemName.trim()}>
            Add Item
          </Button>
        </form>
      </Modal>
    </div>
  );
}
