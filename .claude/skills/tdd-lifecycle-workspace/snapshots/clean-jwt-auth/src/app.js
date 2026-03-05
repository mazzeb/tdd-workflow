const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const bookmarkRoutes = require('./routes/bookmarks');
const folderRoutes = require('./routes/folders');

const app = express();

app.use(express.json());

// Public routes
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Protected routes
app.use('/api/bookmarks', authenticate, bookmarkRoutes);
app.use('/api/folders', authenticate, folderRoutes);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
