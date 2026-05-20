import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from './hooks/useSocket';

export type SocketContextType = ReturnType<typeof useSocket>;

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const socketInstance = useSocket();
  return (
    <SocketContext.Provider value={socketInstance}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocketContext must be used within a SocketProvider');
  return context;
};
