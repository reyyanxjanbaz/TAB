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

const DRINK_ITEMS = ['Tea', 'Coffee', 'Lemon Tea', 'Ginger Tea', 'Green Tea', 'Boost', 'Badam Milk'];
const FOOD_ITEMS  = ['Burger', 'Fries', 'Pizza', 'Shawarma', 'Sandwich', 'Salad', 'Wrap'];

export default function OrderSetup() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [session, setSession]     = useState(null);
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [timer, setTimer]         = useState(300);
  const [customTimer, setCustomTimer] = useState('');
  const [showCustom, setShowCustom]   = useState(false);
  const [itemName, setItemName]   = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [starting, setStarting]   = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  // Saved lists
  const [savedLists, setSavedLists]   = useState([]);
  const [showSaveList, setShowSaveList] = useState(false);
  const [saveListName, setSaveListName] = useState('');
  const [savingList, setSavingList]   = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => { loadSession(); }, [id]);

  useEffect(() => {
    if (session?.group_id) loadSavedLists(session.group_id);
  }, [session?.group_id]);

  async function loadSession() {
    try {
      const data = await api.getSession(id);
      if (data.session.created_by !== user.id) { navigate(`/sessions/${id}`); return; }
      if (data.session.status !== 'setup') {
        navigate(data.session.status === 'active' ? `/sessions/${id}` : `/sessions/${id}/summary`);
        return;
      }
      setSession(data.session);
      setItems(data.items);
    } catch { navigate('/'); }
    finally { setLoading(false); }
  }

  async function loadSavedLists(groupId) {
    try {
      const { lists } = await api.getSavedLists(groupId);
      setSavedLists(lists);
    } catch { /* optional feature */ }
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
    } catch (e) { alert(e.message); }
    finally { setAddingItem(false); }
  }

  async function removeItem(itemId) {
    try {
      await api.deleteItem(id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } catch (e) { alert(e.message); }
  }

  async function loadList(list) {
    if (items.length > 0 && !confirm(`Replace ${items.length} current item(s) with "${list.name}"?`)) return;
    setLoadingList(true);
    try {
      await Promise.all(items.map(item => api.deleteItem(id, item.id)));
      setItems([]);
      const newItems = [];
      for (const li of list.items) {
        const { item } = await api.addItem(id, { name: li.name, price: li.price });
        newItems.push(item);
      }
      setItems(newItems);
    } catch (e) { alert(e.message); await loadSession(); }
    finally { setLoadingList(false); }
  }

  async function saveCurrentAsList(e) {
    e.preventDefault();
    if (!saveListName.trim()) return;
    setSavingList(true);
    try {
      const { list } = await api.createSavedList(session.group_id, {
        name: saveListName.trim(),
        items: items.map(i => ({ name: i.name, price: i.price })),
      });
      setSavedLists(prev => [list, ...prev]);
      setShowSaveList(false);
      setSaveListName('');
    } catch (e) { alert(e.message); }
    finally { setSavingList(false); }
  }

  async function deleteSavedList(listId) {
    if (!confirm('Delete this saved list?')) return;
    try {
      await api.deleteSavedList(session.group_id, listId);
      setSavedLists(prev => prev.filter(l => l.id !== listId));
    } catch (e) { alert(e.message); }
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
    } catch (e) { alert(e.message); }
    finally { setStarting(false); }
  }

  if (loading) {
    return <div className="h-[100dvh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  function QuickChip({ name }) {
    const added = items.some(i => i.name === name);
    return (
      <button
        onClick={() => !added && addItem(name, '')}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          added
            ? 'bg-orange-100 text-orange-600 ring-1 ring-orange-300'
            : 'bg-white text-stone-700 border border-stone-200 active:bg-stone-50'
        }`}
      >
        {added ? `✓ ${name}` : name}
      </button>
    );
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

        {/* Saved Lists */}
        {savedLists.length > 0 && (
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Saved Lists</h2>
            <div className="flex flex-col gap-2">
              {savedLists.map(list => (
                <div key={list.id} className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 border border-stone-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800">{list.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5 truncate">
                      {list.items.map(i => i.name).join(' · ')}
                    </p>
                  </div>
                  <button
                    onClick={() => loadList(list)}
                    disabled={loadingList}
                    className="shrink-0 text-sm font-semibold text-orange-500 bg-orange-50 px-3 py-1.5 rounded-xl active:bg-orange-100 disabled:opacity-50"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => deleteSavedList(list.id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center text-stone-400 active:text-stone-700 text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drinks */}
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Drinks</h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {DRINK_ITEMS.map(name => <QuickChip key={name} name={name} />)}
        </div>

        {/* Food */}
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Food</h2>
        <div className="flex flex-wrap gap-2 mb-5">
          {FOOD_ITEMS.map(name => <QuickChip key={name} name={name} />)}
          <button
            onClick={() => setShowAddItem(true)}
            className="px-4 py-2 rounded-full text-sm font-medium bg-orange-500 text-white"
          >
            + Custom
          </button>
        </div>

        {/* Current menu */}
        {items.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Menu ({items.length} item{items.length !== 1 ? 's' : ''})
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
            <p className="text-sm">Pick items above or load a saved list</p>
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
              min="1" max="120"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white border-t border-stone-100 px-5 py-4 pb-safe space-y-2">
        {items.length > 0 && (
          <Button size="lg" variant="outline" onClick={() => setShowSaveList(true)}>
            💾 Save as list
          </Button>
        )}
        <Button size="lg" onClick={startOrder} loading={starting} disabled={items.length === 0}>
          🚀 Start Order — Notify Group
        </Button>
      </div>

      {/* Custom item modal */}
      <Modal open={showAddItem} onClose={() => setShowAddItem(false)} title="Add Custom Item">
        <form onSubmit={e => { e.preventDefault(); addItem(itemName, itemPrice); }} className="flex flex-col gap-4 pt-3">
          <Input
            label="Item name"
            placeholder="e.g. Mango Lassi"
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

      {/* Save list modal */}
      <Modal open={showSaveList} onClose={() => { setShowSaveList(false); setSaveListName(''); }} title="Save as List">
        <form onSubmit={saveCurrentAsList} className="flex flex-col gap-4 pt-3">
          <p className="text-sm text-stone-500">
            Saves the current {items.length} item{items.length !== 1 ? 's' : ''} as a named list you can load next time.
          </p>
          <Input
            label="List name"
            placeholder="e.g. Morning Teas, Friday Lunch…"
            value={saveListName}
            onChange={e => setSaveListName(e.target.value)}
            autoFocus
          />
          <Button type="submit" size="lg" loading={savingList} disabled={!saveListName.trim()}>
            Save List
          </Button>
        </form>
      </Modal>
    </div>
  );
}
