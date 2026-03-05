const express = require('express');
const router = express.Router();
const Bookmark = require('../models/Bookmark');

// GET /api/bookmarks
router.get('/', (req, res) => {
  const bookmarks = Bookmark.findByUser(req.user.id);
  res.json({ data: bookmarks });
});

// POST /api/bookmarks
router.post('/', (req, res) => {
  const { url, title, folderId } = req.body;

  if (!url) {
    return res.status(400).json({ error: { code: 'MISSING_URL', message: 'URL is required' } });
  }

  const bookmark = Bookmark.create({
    url,
    title: title || url,
    folderId: folderId || null,
    userId: req.user.id,
  });

  res.status(201).json({ data: bookmark });
});

// DELETE /api/bookmarks/:id
router.delete('/:id', (req, res) => {
  const bookmark = Bookmark.findById(req.params.id);

  if (!bookmark || bookmark.userId !== req.user.id) {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Bookmark not found' } });
  }

  Bookmark.delete(req.params.id);
  res.status(204).send();
});

module.exports = router;
