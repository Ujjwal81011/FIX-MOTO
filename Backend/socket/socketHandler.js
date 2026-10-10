function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join:user', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });

    socket.on('join:request', (requestId) => {
      if (requestId) socket.join(`request:${requestId}`);
    });

    
    socket.on('mechanic:location', ({ requestId, mechanicId, coordinates }) => {
    if (!requestId || !Array.isArray(coordinates) || coordinates.length !== 2) return;

    io.to(`request:${requestId}`).emit('mechanic:location', {
    requestId,
    mechanicId,
    coordinates,
    });
  });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

module.exports = registerSocketHandlers;
