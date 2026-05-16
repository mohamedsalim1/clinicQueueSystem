import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // تحديد رابط السيرفر
    const URL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/api$/, '') 
      : `${window.location.protocol}//${window.location.hostname}:3000`;

    console.log('[Socket] Connecting to:', URL);

    const newSocket = io(URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log('[Socket] Connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
      socketRef.current = null;
    };
  }, []);

  // الانضمام لغرفة العيادة (استقبال/طبيب)
  const joinClinic = (clinicId) => {
    if (socketRef.current && clinicId) {
      console.log('[Socket] Emitting join-clinic:', clinicId);
      // إرسال الـ ID كنص مباشر لتفادي مشكلة [object Object]
      socketRef.current.emit('join-clinic', String(clinicId));
    }
  };

  // الانضمام لغرفة شاشة العرض
  const joinDisplay = () => {
    if (socketRef.current) {
      console.log('[Socket] Emitting join-display');
      socketRef.current.emit('join-display');
    }
  };

  // الاستماع للأحداث (Subscribe)
  const subscribeTo = (event, callback) => {
    if (!socketRef.current) return () => {};

    console.log(`[Socket] Subscribing to: ${event}`);
    socketRef.current.on(event, callback);

    // دالة تنظيف لإزالة المستمع عند تحديث الصفحة
    return () => {
      console.log(`[Socket] Unsubscribing from: ${event}`);
      socketRef.current?.off(event, callback);
    };
  };

  const value = {
    isConnected,
    joinClinic,
    joinDisplay,
    subscribeTo,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};