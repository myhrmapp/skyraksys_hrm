const socketIo = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected to socket.io:', socket.id);
      
      socket.on('authenticate', (data) => {
        if (data && data.userId) {
          socket.join(`user_${data.userId}`);
          console.log(`Socket ${socket.id} joined room user_${data.userId}`);
        }
        if (data && data.role) {
          const roleStr = String(data.role).toLowerCase();
          socket.join(`role_${roleStr}`);
          console.log(`Socket ${socket.id} joined room role_${roleStr}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected from socket.io:', socket.id);
      });
    });

    return io;
  },
  getIo: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
