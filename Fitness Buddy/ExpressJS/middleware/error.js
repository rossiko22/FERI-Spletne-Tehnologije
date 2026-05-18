// Central error handler. Express recognises 4-arg middleware as an error handler.
module.exports = function errorMiddleware(err, req, res, next) {
  console.error('[error]', err.stack || err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.code || 'internal_error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
};
