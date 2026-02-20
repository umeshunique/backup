import { createContext, useContext } from 'react';

export const AddServerContext = createContext<(() => void) | null>(null);

export function useAddServer() {
  return useContext(AddServerContext);
}
