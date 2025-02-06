'use client';

// Components
import AuthWrapper from '@/components/AuthWrapper';

// hooks
import useWebSocket from '@/hooks/useWebSocket';

export default function Home() {
  const { socket, isConnected, error } = useWebSocket();

  return (
    <AuthWrapper socket={socket} isConnecting={isConnected} error={error} />
  );
}

Home.displayName = 'Home';
