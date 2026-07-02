// src/routes/resumes.js
const express = require('express');
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const auth = require('../middleware/auth');
const db = require('../config/db');
const s3 = require('../config/s3');
const router = express.Router();

// ─── POST /api/resumes/presign ────────────────────────
// Generate a presigned S3 URL for direct browser upload
router.post('/presign', auth, async (req, res) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType)
      return res.status(400).json({ error: 'filename and contentType required' });

    // Only allow PDF and DOCX
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(contentType))
      return res.status(400).json({ error: 'Only PDF and DOCX files allowed' });

    // Create unique S3 key
    const key = `users/${req.user.userId}/resumes/${uuidv4()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType
    });

    // Generate URL valid for 5 minutes
    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ signedUrl, key });

  } catch (err) {
    console.error('Presign error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/resumes ────────────────────────────────
// Register resume in DB after successful S3 upload
router.post('/', auth, async (req, res) => {
  try {
    const { s3_key, filename } = req.body;

    if (!s3_key || !filename)
      return res.status(400).json({ error: 's3_key and filename required' });

    const [resume] = await db('resumes')
      .insert({
        user_id: req.user.userId,
        s3_key,
        filename,
        status: 'uploaded'
      })
      .returning('*');

    res.status(201).json(resume);

  } catch (err) {
    console.error('Create resume error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
// Delete resume from DB and S3
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await db('resumes')
      .where({ id: req.params.id, user_id: req.user.userId })
      .first();

    if (!resume)
      return res.status(404).json({ error: 'Resume not found' });

    // Delete from S3
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: resume.s3_key
    }));

    // Delete from DB
    await db('resumes').where({ id: req.params.id }).delete();

    res.json({ message: 'Resume deleted successfully' });
  } catch (err) {
    console.error('Delete resume error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;