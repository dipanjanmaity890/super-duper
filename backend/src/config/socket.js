const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

/**
 * Initialise Socket.io on an existing HTTP server.
 */
const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── Auth middleware ───────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.id;
      socket.username = decoded.username;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handling ───────────────────────────────────────────────────
  // In-memory chat history: matchId → [{...msg}] (last 100 per match)
  const chatHistory = {};

  io.on('connection', (socket) => {
    console.log(`[Socket] User ${socket.username} (${socket.userId}) connected`);

    // Fan joins a match room
    socket.on('join_match', (matchId) => {
      socket.join(`match:${matchId}`);
      console.log(`[Socket] ${socket.username} joined match:${matchId}`);

      // Send last 100 chat messages to the new joiner
      if (chatHistory[matchId]?.length) {
        socket.emit('chat_history', chatHistory[matchId]);
      }

      // Tell the room someone joined (for active viewer count)
      io.to(`match:${matchId}`).emit('viewer_count', {
        matchId,
        count: getRoomSize(`match:${matchId}`),
      });
    });

    socket.on('leave_match', (matchId) => {
      socket.leave(`match:${matchId}`);
      io.to(`match:${matchId}`).emit('viewer_count', {
        matchId,
        count: getRoomSize(`match:${matchId}`),
      });
    });

    // ── Live Chat ──────────────────────────────────────────────────────────────
    socket.on('chat_send', ({ matchId, text }) => {
      if (!matchId || !text?.trim()) return;

      const clean = text.trim().slice(0, 300); // cap length
      const msg = {
        id:       `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        userId:   socket.userId,
        username: socket.username,
        text:     clean,
        ts:       new Date().toISOString(),
      };

      // Store in memory (keep last 100)
      if (!chatHistory[matchId]) chatHistory[matchId] = [];
      chatHistory[matchId].push(msg);
      if (chatHistory[matchId].length > 100) chatHistory[matchId].shift();

      // Broadcast to everyone in the match room (including sender)
      io.to(`match:${matchId}`).emit('chat_message', msg);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] User ${socket.username} disconnected`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialised');
  return io;
};

const getRoomSize = (room) => {
  return io.sockets.adapter.rooms.get(room)?.size ?? 0;
};

// ─── Broadcast helpers ─────────────────────────────────────────────────────

/** Broadcast a match event to all fans watching that match */
const emitMatchEvent = (matchId, event) => {
  getIO().to(`match:${matchId}`).emit('match_event', event);
};

/** Broadcast updated score */
const emitScoreUpdate = (matchId, scoreData) => {
  getIO().to(`match:${matchId}`).emit('score_update', scoreData);
};

/** Push a new poll to all watchers */
const emitNewPoll = (matchId, poll) => {
  getIO().to(`match:${matchId}`).emit('new_poll', poll);
};

/** Push updated poll vote counts */
const emitPollUpdate = (matchId, pollId, options) => {
  getIO().to(`match:${matchId}`).emit('poll_update', { pollId, options });
};

/** Push updated reaction counts for an event */
const emitReactionUpdate = (matchId, eventId, counts) => {
  getIO().to(`match:${matchId}`).emit('reaction_update', { eventId, counts });
};

/** Push a new fan feed post */
const emitFeedPost = (matchId, post) => {
  getIO().to(`match:${matchId}`).emit('feed_post', post);
};

/** Push updated leaderboard top-10 */
const emitLeaderboardUpdate = (matchId, leaderboard) => {
  getIO().to(`match:${matchId}`).emit('leaderboard_update', leaderboard);
};

/** Push points earned to a specific user's socket(s) */
const emitPointsEarned = (userId, pointsData) => {
  getIO().to(`user:${userId}`).emit('points_earned', pointsData);
};

/** Push updated live stats */
const emitStatsUpdate = (matchId, stats) => {
  getIO().to(`match:${matchId}`).emit('stats_update', stats);
};

/** Broadcast momentum change */
const emitMomentumUpdate = (matchId, momentum) => {
  getIO().to(`match:${matchId}`).emit('momentum_update', momentum);
};

module.exports = {
  init,
  getIO,
  emitMatchEvent,
  emitScoreUpdate,
  emitNewPoll,
  emitPollUpdate,
  emitReactionUpdate,
  emitFeedPost,
  emitLeaderboardUpdate,
  emitPointsEarned,
  emitStatsUpdate,
  emitMomentumUpdate,
  getRoomSize,
};
