const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');

// GET /api/folders
router.get('/', (req, res) => {
  const folders = Folder.findByUser(req.user.id);
  res.json({ data: folders });
});

// POST /api/folders
router.post('/', (req, res) => {
  const { name, parentId } = req.body;

  if (!name) {
    return res.status(400).json({ error: { code: 'MISSING_NAME', message: 'Folder name is required' } });
  }

  const folder = Folder.create({
    name,
    parentId: parentId || null,
    userId: req.user.id,
  });

  res.status(201).json({ data: folder });
});

module.exports = router;
