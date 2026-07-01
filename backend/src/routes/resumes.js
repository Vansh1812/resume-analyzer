// src/routes/resumes.js
const express = require('express');
const auth = require('../middleware/auth');
const db = require('../config/db');
const router = express.Router();

// ─── GET /api/resumes ─────────────────────────────────
// Get all resumes for logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const resumes = await db('resumes')
      .where({ user_id: req.user.userId })
      .orderBy('created_at', 'desc');

    res.json(resumes);
  } catch (err) {
    console.error('Get resumes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/resumes/:id ─────────────────────────────
// Get single resume with its analysis
router.get('/:id', auth, async (req, res) => {
  try {
    const resume = await db('resumes')
      .where({ id: req.params.id, user_id: req.user.userId })
      .first();

    if (!resume)
      return res.status(404).json({ error: 'Resume not found' });

    const analysis = await db('analyses')
      .where({ resume_id: resume.id })
      .first();

    res.json({ ...resume, analysis: analysis || null });
  } catch (err) {
    console.error('Get resume error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/resumes/:id ──────────────────────────
// Delete a resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await db('resumes')
      .where({ id: req.params.id, user_id: req.user.userId })
      .first();

    if (!resume)
      return res.status(404).json({ error: 'Resume not found' });

    await db('resumes')
      .where({ id: req.params.id })
      .delete();

    res.json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Delete resume error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;