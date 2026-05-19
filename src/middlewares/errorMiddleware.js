const { fail } = require('../utils/apiResponse');

const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let error = err.message;

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    error = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    error = err.message;
  }

  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
    error = message;
  }

  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    const issues = err.issues || err.errors || [];
    error = issues.map((e) => e.message).join(', ');
  }

  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    error = 'Internal server error';
  }

  return fail(res, statusCode, message, error);
};

module.exports = { notFound, errorHandler };
