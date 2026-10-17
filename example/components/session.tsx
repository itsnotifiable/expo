import { createContext, useContext, useState, type ReactNode } from "react";

const SessionContext = createContext<{
  readonly disconnect: () => void;
} | null>(null);

export function SessionProvider({
  disconnect,
  children,
}: {
  readonly disconnect: () => void;
  readonly children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ disconnect }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): { readonly disconnect: () => void } {
  const session = useContext(SessionContext);

  if (session === null) {
    throw new Error("useSession must be used within SessionProvider");
  }

  return session;
}

export function usePublicKey(): {
  readonly publicKey: string | null;
  readonly connect: (key: string) => void;
  readonly disconnect: () => void;
} {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  return {
    publicKey,
    connect: (key: string) => {
      const trimmed = key.trim();

      if (trimmed.length > 0) {
        setPublicKey(trimmed);
      }
    },
    disconnect: () => {
      setPublicKey(null);
    },
  };
}
