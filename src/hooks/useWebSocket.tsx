import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = "ws://localhost:4500";

interface WebSocketProps {
  socketInstance: Socket | null;
  isConnected: Boolean;
  error: String | null;
}

export const useWebSocket = (): WebSocketProps => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocketInstance(socket);

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to server");
      // socket.emit("connectServer", { userId, serverId });
    });
    socket.on("error", (error) => {
      setError(error);
      console.log("Connect server error");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socketInstance, isConnected, error };
};

export default useWebSocket;
