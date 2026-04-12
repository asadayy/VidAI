import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext(null);

// Socket URL — strip /api/v1 from the API base URL
function getSocketUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/v1\/?$/, '');
  }
  return 'http://localhost:5000';
}

export function SocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);
  const disconnectToastRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.3,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Dismiss any active disconnection toast
      if (disconnectToastRef.current) {
        toast.dismiss(disconnectToastRef.current);
        disconnectToastRef.current = null;
        toast.success('Reconnected', { duration: 2000 });
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      // Only show toast for unexpected disconnects (not user-initiated)
      if (reason !== 'io client disconnect') {
        disconnectToastRef.current = toast.loading(
          'Connection lost. Reconnecting…',
          { duration: Infinity }
        );
      }
    });

    newSocket.io.on('reconnect_failed', () => {
      if (disconnectToastRef.current) {
        toast.dismiss(disconnectToastRef.current);
        disconnectToastRef.current = null;
      }
      toast.error('Unable to reconnect. Please refresh the page.', { duration: 10000 });
    });

    newSocket.on('user_online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    newSocket.on('user_offline', ({ userId }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    newSocket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      if (disconnectToastRef.current) {
        toast.dismiss(disconnectToastRef.current);
        disconnectToastRef.current = null;
      }
    };
  }, [isAuthenticated, token]);

  const isOnline = useCallback(
    (userId) => onlineUsers.has(userId),
    [onlineUsers]
  );

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUsers, isOnline }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
