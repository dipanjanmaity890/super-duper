/**
 * Centralised error handler.
 * Must be registered as the LAST middleware in Express.
 */
const errorHandler = (err, req, res, _next) => {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${req.method} ${req.path} →`, err);
  }

  // Postgres unique-violation
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Duplicate entry', detail: err.detail });
  }

  // Postgres FK violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced resource not found' });
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

/**
 * 404 handler – register before errorHandler.
 */
const notFound = (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
};

module.exports = { errorHandler, notFound };
