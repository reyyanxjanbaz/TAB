import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Avatar, AvatarStack } from '../components/Avatar';
import { timeAgo } from '../lib/utils';
import { promptPushPermission } from '../lib/push';

const FOOD_EMOJIS = ['🍔', '🍕', '🌮', '🍜', '🥗', '☕', '🍱', '🧆', '🌯', '🍣'];

export default function GroupDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Admin modal state
  const [showAdmin, setShowAdmin] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🍔');
  const [saving, setSaving] = useState(false);
  const [kickingId, setKickingId] = useState(null);

  // Prompt for push notifications once when entering the group
  useEffect(() => {
    promptPushPermission().catch(() => {});
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [id]);

  useEffect(() => {
    if (!socket || !data) return;
    socket.emit('join-group', id);

    const onSessionStarted = ({ session }) => {
      setData(prev => prev ? { ...prev, sessions: [session, ...prev.sessions] } : prev);
      navigate(`/sessions/${session.id}`);
    };
    const onSessionClosed = ({ sessionId }) => {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, status: 'closed' } : s),
        };
      });
    };

    socket.on('session:started', onSessionStarted);
    socket.on('session:closed', onSessionClosed);
    return () => {
      socket.off('session:started', onSessionStarted);
      socket.off('session:closed', onSessionClosed);
    };
  }, [socket, data, id]);

  async function loadGroup() {
    try {
      const d = await api.getGroup(id);
      setData(d);
    } catch (e) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function startOrder() {
    setStarting(true);
    try {
      const { session } = await api.createSession(id);
      navigate(`/sessions/${session.id}/setup`);
    } catch (e) {
      alert(e.message);
    } finally {
      setStarting(false);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(data.group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyLink() {
    const url = `${window.location.origin}/join/${data.group.invite_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function openAdmin() {
    setEditName(data.group.name);
    setEditEmoji(data.group.icon_emoji);
    setShowAdmin(true);
  }

  async function saveGroupEdit(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const { group } = await api.updateGroup(id, { name: editName.trim(), icon_emoji: editEmoji });
      setData(prev => ({ ...prev, group }));
      setShowAdmin(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function kickMember(userId) {
    if (!confirm('Remove this member from the group?')) return;
    setKickingId(userId);
    try {
      await api.kickMember(id, userId);
      setData(prev => ({
        ...prev,
        members: prev.members.filter(m => m.id !== userId),
      }));
    } catch (e) {
      alert(e.message);
    } finally {
      setKickingId(null);
    }
  }

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;
  const { group, members, sessions, my_role } = data;
  const activeSession = sessions.find(s => s.status === 'active' || s.status === 'setup');
  const isAdmin = my_role === 'admin';

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 safe-top border-b border-stone-100 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-stone-400 text-xl p-1">←</button>
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-2xl">
              {group.icon_emoji}
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900">{group.name}</h1>
              <p className="text-sm text-stone-500">{members.length} members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={openAdmin}
                className="text-sm font-medium text-stone-500 bg-stone-100 w-9 h-9 rounded-xl flex items-center justify-center"
              >
                ⚙
              </button>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="text-sm font-medium text-orange-500 bg-orange-50 px-3 py-2 rounded-xl"
            >
              Invite
            </button>
          </div>
        </div>

        <AvatarStack users={members} size="sm" max={6} />
      </div>

      <div className="flex-1 px-5 pt-5 pb-safe overflow-y-auto no-scrollbar">

        {/* Active/setup session banner */}
        {activeSession && (
          <button
            onClick={() => navigate(activeSession.status === 'active' ? `/sessions/${activeSession.id}` : `/sessions/${activeSession.id}/setup`)}
            className="w-full bg-orange-500 text-white rounded-2xl p-4 mb-4 flex items-center gap-3 animate-bounce-gentle"
          >
            <span className="text-2xl">{activeSession.status === 'active' ? '🔴' : '⏳'}</span>
            <div className="flex-1 text-left">
              <p className="font-semibold">{activeSession.status === 'active' ? 'Order in progress!' : 'Order being set up...'}</p>
              <p className="text-sm text-orange-100">Tap to {activeSession.status === 'active' ? 'join the order' : 'view setup'}</p>
            </div>
            <span className="text-xl">›</span>
          </button>
        )}

        {/* Start Order */}
        {!activeSession && (
          <Button size="lg" onClick={startOrder} loading={starting} className="mb-5">
            🍔 Start Order
          </Button>
        )}

        {/* Order History */}
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Order History</h2>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => {
                  if (s.status === 'active') navigate(`/sessions/${s.id}`);
                  else if (s.status === 'setup') {
                    if (s.created_by === user.id) navigate(`/sessions/${s.id}/setup`);
                  } else {
                    navigate(`/sessions/${s.id}/summary`);
                  }
                }}
                disabled={s.status === 'setup' && s.created_by !== user.id}
                className="bg-white rounded-2xl p-4 text-left border border-stone-100 active:bg-stone-50 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-stone-800">
                      Order by {s.host_name}
                    </p>
                    <p className="text-sm text-stone-500">{timeAgo(s.created_at)}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' :
                    s.status === 'setup' ? 'bg-blue-100 text-blue-700' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    {s.status === 'active' ? 'Live' : s.status === 'setup' ? 'Setting up' : 'Closed'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invite People">
        <div className="flex flex-col gap-4 pt-3">
          <div className="bg-stone-50 rounded-2xl p-5 text-center">
            <p className="text-sm text-stone-500 mb-1">Invite code</p>
            <p className="text-4xl font-black tracking-widest text-stone-900">{group.invite_code}</p>
          </div>
          <Button onClick={copyCode} variant={copied ? 'secondary' : 'primary'} size="lg">
            {copied ? '✓ Copied!' : 'Copy Code'}
          </Button>
          <Button onClick={copyLink} variant="outline" size="lg">
            Share Link
          </Button>
        </div>
      </Modal>

      {/* Admin / Manage Group Modal */}
      <Modal open={showAdmin} onClose={() => setShowAdmin(false)} title="Manage Group">
        <form onSubmit={saveGroupEdit} className="flex flex-col gap-4 pt-3">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Group icon</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_EMOJIS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setEditEmoji(e)}
                  className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all ${editEmoji === e ? 'bg-orange-100 ring-2 ring-orange-400 scale-110' : 'bg-stone-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Group name"
            value={editName}
            onChange={e => setEditName(e.target.value)}
          />
          <Button type="submit" size="lg" loading={saving} disabled={!editName.trim()}>
            Save Changes
          </Button>

          {/* Members section */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-sm font-semibold text-stone-500 uppercase tracking-wide mb-3">Members</p>
            <div className="flex flex-col gap-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2.5 px-1">
                  <Avatar user={m} size="sm" />
                  <span className="flex-1 font-medium text-stone-800 text-sm">{m.username}</span>
                  {m.id === user.id ? (
                    <span className="text-xs text-stone-400 font-medium">You</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => kickMember(m.id)}
                      disabled={kickingId === m.id}
                      className="text-xs text-red-500 font-semibold px-3 py-1.5 rounded-xl bg-red-50 active:bg-red-100 disabled:opacity-50"
                    >
                      {kickingId === m.id ? '…' : 'Remove'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
