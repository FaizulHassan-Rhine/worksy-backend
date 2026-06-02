const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan'); 
const { ok } = require('./utils/apiResponse');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const noteRoutes = require('./routes/noteRoutes');
const fileRoutes = require('./routes/fileRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const savedViewRoutes = require('./routes/savedViewRoutes');

const { UPLOAD_DIR, ensureUploadDir } = require('./config/upload');

ensureUploadDir();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/', (req, res) => {
  return ok(
    res,
    {
      name: 'Worksy API',
      status: 'running',
      health: '/api/health',
      basePath: '/api',
    },
    'Worksy API is running'
  );
});

app.get('/api', (req, res) => {
  return ok(
    res,
    {
      status: 'ok',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth',
        workspaces: '/api/workspaces',
        projects: '/api/projects',
        tasks: '/api/tasks',
        notes: '/api/notes',
        files: '/api/files',
        dashboard: '/api/dashboard',
        messages: '/api/messages',
        notifications: '/api/notifications',
        savedViews: '/api/saved-views',
      },
    },
    'Worksy API'
  );
});

app.get('/api/health', (req, res) => {
  return ok(res, { status: 'ok', timestamp: new Date().toISOString() }, 'API is healthy');
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/saved-views', savedViewRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
