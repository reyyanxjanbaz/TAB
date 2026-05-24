import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Avatar, AvatarStack } from '../components/Avatar';
import { timeAgo } from '../lib/utils';
import { promptPushPermission } from '../lib/push';

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

  useEffect(() => {
    loadGroup();
  }, [id]);

  useEffect(() => {
    if (!socket || !data) return;
    socket.emit('join-group', id);

    const onSessionStarted = ({ session }) => {
      navigate(`/sessions/${session.id}`);
    };
    socket.on('session:started', onSessionStarted);
    return () => socket.off('session:started', onSessionStarted);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;
  const { group, members, sessions, my_role } = data;
  const isAdmin = my_role === 'admin';
  const activeSession = sessions.find(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 safe-top border-b border-stone-100">
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
          <button
            onClick={() => setShowInvite(true)}
            className="text-sm font-medium text-orange-500 bg-orange-50 px-3 py-2 rounded-xl"
          >
            Invite
          </button>
        </div>

        <AvatarStack users={members} size="sm" max={6} />
      </div>

      <div className="flex-1 px-5 pt-5 pb-safe overflow-y-auto no-scrollbar">

        {/* Active session banner */}
        {activeSession && (
          <button
            onClick={() => navigate(`/sessions/${activeSession.id}`)}
            className="w-full bg-orange-500 text-white rounded-2xl p-4 mb-4 flex items-center gap-3 animate-bounce-gentle"
          >
            <span className="text-2xl">🔴</span>
            <div className="flex-1 text-left">
              <p className="font-semibold">Order in progress!</p>
              <p className="text-sm text-orange-100">Tap to join the order</p>
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
                onClick={() => navigate(s.status === 'active' ? `/sessions/${s.id}` : `/sessions/${s.id}/summary`)}
                className="bg-white rounded-2xl p-4 text-left border border-stone-100 active:bg-stone-50 w-full"
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
    </div>
  );
}
