import React, { createContext, useContext } from 'react';
import * as p2p from '../p2p/index';

const P2PContext = createContext(p2p);
export const useP2P = () => useContext(P2PContext);
export const P2PProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <P2PContext.Provider value={p2p}>{children}</P2PContext.Provider>
);
