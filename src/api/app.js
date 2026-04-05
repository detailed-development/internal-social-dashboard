import express from 'express';
import cors from 'cors';
import clientRoutes from './routes/clients.js';
import postRoutes from './routes/posts.js';
import analyticsRoutes from './routes/analytics.js';
import ga4PropertiesRoutes from './routes/ga4-properties.js';
import adminRoutes from './routes/admin.js';
import messagesRoutes from './routes/messages.js';
import socialRoutes from './routes/social.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/clients', clientRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ga4-properties', ga4PropertiesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/social', socialRoutes);

export default app;
