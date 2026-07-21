import { io } from 'socket.io-client';
// Using named import for authService since it's exported as a named export
import { authService } from './auth.service';
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class SocketService {
  socket = null;

  connect() {
    if (!this.socket) {
      const user = authService.getCurrentUser();
      
      this.socket = io(SOCKET_URL, {
        auth: {
          token: user ? user.accessToken : null
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      this.socket.on('connect', () => {
      });

      this.socket.on('disconnect', () => {
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  emit(eventName, data) {
    if (this.socket) {
      this.socket.emit(eventName, data);
    }
  }
}

const socketService = new SocketService();
export default socketService;
