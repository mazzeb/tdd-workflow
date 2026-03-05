function errorHandler(err, req, res, _next) {
  console.error(err.stack);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
  });
}

module.exports = { errorHandler };
