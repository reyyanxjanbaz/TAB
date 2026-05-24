import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export default function JoinViaLink() {
  const { code } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('joining');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      localStorage.setItem('tab_pending_join', code);
      navigate('/welcome');
      return;
    }
    api.joinGroup(code)
      .then(({ group }) => navigate(`/groups/${group.id}`, { replace: true }))
      .catch(() => { setStatus('error'); });
  }, [user, code, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-stone-500">
      {status === 'joining' ? (
        <>
          <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
          <p>Joining group...</p>
        </>
      ) : (
        <>
          <p className="text-lg">Invalid invite link</p>
          <button onClick={() => navigate('/')} className="text-orange-500 font-medium">Go home</button>
        </>
      )}
    </div>
  );
}
