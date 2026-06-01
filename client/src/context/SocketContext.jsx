import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if the user is authenticated
    if (user) {
      // Because we use a proxy in vite config or axios baseURL, 
      // connecting to '/' usually hits the backend when served,
      // but in dev it should point to backend URL if not proxied correctly by socket.io.
      // Socket.io will automatically poll/upgrade.
      const newSocket = io('/', {
        path: '/socket.io',
      });

      setSocket(newSocket);

      newSocket.on('connect', () => {
        // Join a room with the user's ID to receive targeted events
        newSocket.emit('join_room', user._id);
      });

      return () => {
        newSocket.disconnect();
      };
    } else if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  }, [user]); // Re-run if user logs in/out

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
