import { useEffect, useState } from 'react';

export default function useSimulationStatus(sessionId) {
  const [status, setStatus] = useState('Disconnected');

  useEffect(() => {
    if (!sessionId) {
      return undefined;
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/simulation/${sessionId}`);
    ws.onopen = () => setStatus('Connected');
    ws.onclose = () => setStatus('Disconnected');

    return () => ws.close();
  }, [sessionId]);

  return status;
}
