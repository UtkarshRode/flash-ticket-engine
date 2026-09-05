export const errorHandler = (err, req, res, next) => {
  console.error(`[API Error] ${err.status || 500} - ${err.message}`);

  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: err.code || 'SERVER_ERROR',
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
