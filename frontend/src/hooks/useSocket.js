import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './useAuth';

const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Chỉ kết nối khi có user
    if (!user) return;

    // Tự động detect API URL dựa trên current host
    const getApiUrl = () => {
      // Nếu có env variable thì dùng
      if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
      }
      
      // Nếu đang chạy trên localhost thì dùng localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
      
      // Nếu đang chạy trên IP khác thì dùng cùng IP với port 5000
      return `http://${window.location.hostname}:5000`;
    };

    // Tạo socket connection
    const newSocket = io(getApiUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    // Event handlers
    newSocket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', newSocket.id);
      setIsConnected(true);
      
      // Join role room dựa trên user role
      if (user.role?.name) {
        newSocket.emit('join-role-room', user.role.name);
        console.log(`👤 Joined role room: role-${user.role.name}`);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Socket.IO disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 Socket.IO connection error:', error);
      setIsConnected(false);
    });

    setSocket(newSocket);

    // Cleanup khi component unmount
    return () => {
      console.log('🔌 Cleaning up socket connection');
      newSocket.close();
    };
  }, [user]);

  // Function để join bill room
  const joinBillRoom = (billId) => {
    if (socket && isConnected) {
      socket.emit('join-bill-room', billId);
      console.log(`📄 Joined bill room: bill-${billId}`);
    }
  };

  // Function để leave bill room
  const leaveBillRoom = (billId) => {
    if (socket && isConnected) {
      socket.leave(`bill-${billId}`);
      console.log(`📄 Left bill room: bill-${billId}`);
    }
  };

  return {
    socket,
    isConnected,
    joinBillRoom,
    leaveBillRoom
  };
};

export default useSocket;
