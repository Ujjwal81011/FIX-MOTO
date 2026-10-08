import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (!userId) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const url = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const instance = io(url, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    });

    const onConnect = () => {
      setConnected(true);
      // This is the room used by the original backend socket handler.
      instance.emit("join:user", userId);
    };
    const onDisconnect = () => setConnected(false);

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);
    setSocket(instance);

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user?._id, user?.id]);

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
