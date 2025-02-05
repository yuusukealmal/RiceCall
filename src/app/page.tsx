"use client";

import React, { useState, useEffect } from "react";

// Components
import AuthWrapper from "@/components/AuthWrapper";

// hooks
import useWebSocket from "@/hooks/useWebSocket";

// Types
import type { User, Server, Channel, Message, UserList } from "@/types";

export default function Home() {
  const { socketInstance, isConnected, error } = useWebSocket();

  return <AuthWrapper socket={socketInstance} />;
}
