import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/Avatar';
import { timeAgo } from '../lib/utils';
import { requestPushPermission } from '../lib/push';

const FOOD_EMOJIS = ['🍔', '🍕', '🌮', '🍜', '🥗', '☕', '🍱', '🧆', '🌯', '🍣'];

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('🍔');
  const [inviteCode, setInviteCode] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadGroups();
    requestPushPermission();
  }, []);

  async function loadGroups() {
    try {
      const { groups } = await api.getGroups();
      setGroups(groups);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function createGroup(e) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreateLoading(true);
    setFormError('');
    try {
      const { group } = await api.createGroup({ name: groupName.trim(), icon_emoji: groupEmoji });
      setGroups(prev => [{ ...group, member_count: 1, session_count: 0 }, ...prev]);
      setShowCreate(false);
      setGroupName('');
      navigate(`/groups/${group.id}`);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function joinGroup(e) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoinLoading(true);
    setFormError('');
    try {
      const { group } = await api.joinGroup(inviteCode.trim());
      await loadGroups();
      setShowJoin(false);
      setInviteCode('');
      navigate(`/groups/${group.id}`);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setJoinLoading(false);
    }
  }

  return (
    <div className="h-[100dvh] bg-stone-50 flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-stone-900">TAB</h1>
            <p className="text-stone-500 text-sm">Hey, {user?.username} 👋</p>
          </div>
          <Avatar user={user} size="md" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-safe overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="text-6xl mb-4">🍽️</div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">No groups yet</h2>
            <p className="text-stone-500 text-sm mb-8 max-w-xs">
              Create a group with your friends, flatmates, or office team to start ordering together.
            </p>
            <Button onClick={() => setShowCreate(true)} size="lg">
              Create your first group
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-3 mb-5">
              <Button onClick={() => { setShowCreate(true); setFormError(''); }} className="flex-1" size="md">
                + New Group
              </Button>
              <Button onClick={() => { setShowJoin(true); setFormError(''); }} variant="outline" className="flex-1" size="md">
                Join
              </Button>
            </div>

            <div className="flex flex-col gap-3">
              {groups.map(group => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm active:scale-98 text-left w-full border border-stone-100 hover:border-orange-200 transition-colors"
                >
                  <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                    {group.icon_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-900 truncate">{group.name}</p>
                    <p className="text-sm text-stone-500">
                      {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                      {group.session_count > 0 && ` · ${group.session_count} orders`}
                    </p>
                  </div>
                  <span className="text-stone-300 text-xl">›</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Group Modal */}
      <Modal open={showCreate} onClose={() => { setShowCreate(false); setFormError(''); }} title="New Group">
        <form onSubmit={createGroup} className="flex flex-col gap-4 pt-3">
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">Pick an icon</p>
            <div className="flex flex-wrap gap-2">
              {FOOD_EMOJIS.map(e => (
                <button
                  key={e} type="button"
                  onClick={() => setGroupEmoji(e)}
                  className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition-all ${groupEmoji === e ? 'bg-orange-100 ring-2 ring-orange-400 scale-110' : 'bg-stone-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <Input
            label="Group name"
            placeholder="Office Team, Flatmates..."
            value={groupName}
            onChange={e => { setGroupName(e.target.value); setFormError(''); }}
            autoFocus
            error={formError}
          />
          <Button type="submit" size="lg" loading={createLoading} disabled={!groupName.trim()}>
            Create Group
          </Button>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal open={showJoin} onClose={() => { setShowJoin(false); setFormError(''); }} title="Join a Group">
        <form onSubmit={joinGroup} className="flex flex-col gap-4 pt-3">
          <p className="text-stone-500 text-sm">Ask the group admin for their 6-character invite code.</p>
          <Input
            label="Invite code"
            placeholder="ABC123"
            value={inviteCode}
            onChange={e => { setInviteCode(e.target.value.toUpperCase()); setFormError(''); }}
            autoFocus
            className="uppercase tracking-widest text-center text-xl font-bold"
            maxLength={6}
            error={formError}
          />
          <Button type="submit" size="lg" loading={joinLoading} disabled={inviteCode.length < 4}>
            Join Group
          </Button>
        </form>
      </Modal>
    </div>
  );
}
