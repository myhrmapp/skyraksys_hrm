const socketIo = require('socket.io');
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const logger = require('./utils/logger');

let io;

module.exports = {
  init: async (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: '*', // Adjust for production
        methods: ['GET', 'POST', 'PUT', 'DELETE']
      }
    });

    // Set up Redis Adapter for PM2 Cluster Support if enabled
    if (process.env.USE_REDIS === 'true') {
      const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
      try {
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        pubClient.on('error', (err) => logger.error('Redis PubClient Error', { err: err.message }));
        subClient.on('error', (err) => logger.error('Redis SubClient Error', { err: err.message }));

        await Promise.all([pubClient.connect(), subClient.connect()]);
        
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('Socket.io Redis adapter successfully connected for cluster mode');
      } catch (err) {
        logger.error('Failed to initialize Socket.io Redis adapter', { err: err.message });
        // Fallback to in-memory adapter gracefully if redis fails
      }
    } else {
      logger.info('Redis disabled (USE_REDIS is not true). Using default in-memory socket adapter.');
    }

    io.on('connection', (socket) => {
      logger.info(`Client connected to socket.io: ${socket.id}`);
      
      socket.on('authenticate', (data) => {
        if (data && data.userId) {
          socket.join(`user_${data.userId}`);
          logger.info(`Socket ${socket.id} joined room user_${data.userId}`);
        }
        if (data && data.role) {
          const roleStr = String(data.role).toLowerCase();
          socket.join(`role_${roleStr}`);
          logger.info(`Socket ${socket.id} joined room role_${roleStr}`);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected from socket.io: ${socket.id}`);
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
