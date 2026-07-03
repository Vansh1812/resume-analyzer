// lambda/handler.js
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');
const { PdfReader } = require('pdfreader');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

const getDb = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
};

const streamToBuffer = (stream) => new Promise((resolve, reject) => {
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  stream.on('end', () => resolve(Buffer.concat(chunks)));
  stream.on('error', reject);
});

const extractTextFromPDF = (buffer) => new Promise((resolve, reject) => {
  const rows = {};
  new PdfReader().parseBuffer(buffer, (err, item) => {
    if (err) return reject(err);
    if (!item) {
      const text = Object.keys(rows)
        .sort((a, b) => a - b)
        .map(y => rows[y].join(' '))
        .join('\n');
      return resolve(text);
    }
    if (item.text) {
      const y = Math.round(item.y * 10) / 10;
      if (!rows[y]) rows[y] = [];
      rows[y].push(item.text);
    }
  });
});

exports.handler = async (event) => {
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(
    record.s3.object.key.replace(/\+/g, ' ')
  );

  console.log(`Processing file: ${bucket}/${key}`);
  const db = await getDb();

  try {
    // Find resume by s3_key — log what we find
    const resumeResult = await db.query(
      'SELECT id, s3_key, status FROM resumes WHERE s3_key = $1',
      [key]
    );
    console.log('DB lookup result:', JSON.stringify(resumeResult.rows));

    if (resumeResult.rows.length === 0) {
      console.error('No resume found with s3_key:', key);
      console.log('Checking all resumes in DB...');
      const allResumes = await db.query('SELECT id, s3_key FROM resumes ORDER BY created_at DESC LIMIT 5');
      console.log('Latest resumes:', JSON.stringify(allResumes.rows));
      throw new Error(`No resume found with s3_key: ${key}`);
    }

    const resumeId = resumeResult.rows[0].id;
    console.log('Found resume ID:', resumeId);

    // Update status to processing
    await db.query(
      'UPDATE resumes SET status = $1 WHERE id = $2',
      ['processing', resumeId]
    );
    console.log('Status: processing');

    // Download PDF from S3
    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    const pdfBuffer = await streamToBuffer(s3Response.Body);
    console.log('PDF downloaded, size:', pdfBuffer.length);

    // Extract text
    const rawText = await extractTextFromPDF(pdfBuffer);
    console.log('Text extracted, length:', rawText.length);

    // Analyze
    const skills = extractSkills(rawText);
    const experienceYears = extractExperience(rawText);
    const score = calculateScore(rawText, skills);
    const feedback = generateFeedback(rawText, skills);

    console.log('Skills:', skills);
    console.log('Score:', score);
    console.log('Feedback:', feedback);

    // Delete any existing analysis for this resume
    await db.query(
      'DELETE FROM analyses WHERE resume_id = $1',
      [resumeId]
    );

    // Save analysis using resume ID directly
    await db.query(
      `INSERT INTO analyses
        (resume_id, raw_text, skills, experience_years, score, feedback)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        resumeId,
        rawText,
        JSON.stringify(skills),
        experienceYears,
        score,
        JSON.stringify(feedback)
      ]
    );
    console.log('Analysis saved to DB');

    // Update status to done
    await db.query(
      'UPDATE resumes SET status = $1 WHERE id = $2',
      ['done', resumeId]
    );
    console.log('Analysis complete:', key);

  } catch (err) {
    console.error('Lambda error:', err.message);
    try {
      await db.query(
        "UPDATE resumes SET status = 'failed' WHERE s3_key = $1",
        [key]
      );
    } catch (e) {
      console.error('DB update failed:', e.message);
    }
    throw err;
  } finally {
    await db.end();
  }
};

function extractSkills(text) {
  const skillsList = [
    'javascript','python','java','typescript','c++','c#',
    'ruby','go','php','swift','kotlin',
    'react','angular','vue','html','css','tailwind',
    'nextjs','redux','node','express','django','flask',
    'sql','postgresql','mysql','mongodb','redis','dynamodb',
    'aws','docker','kubernetes','git','linux','terraform',
    'rest','graphql','api','microservices','agile'
  ];
  const lower = text.toLowerCase();
  return skillsList.filter(s => lower.includes(s));
}

function extractExperience(text) {
  const matches = text.match(/(\d+)\s*(?:years?|yrs?)/gi);
  if (!matches) return 0;
  return Math.max(...matches.map(m => parseInt(m)));
}

function calculateScore(text, skills) {
  let score = 0;
  if (text.length > 500)                 score += 20;
  if (/education/i.test(text))           score += 20;
  if (/experience/i.test(text))          score += 20;
  if (skills.length >= 3)                score += 20;
  if (/project/i.test(text))             score += 10;
  if (/contact|email|phone/i.test(text)) score += 10;
  return Math.min(score, 100);
}

function generateFeedback(text, skills) {
  const feedback = [];
  if (!/education/i.test(text))     feedback.push('Add an Education section');
  if (!/experience/i.test(text))    feedback.push('Add a Work Experience section');
  if (skills.length < 3)            feedback.push('List more technical skills');
  if (!/project/i.test(text))       feedback.push('Add a Projects section');
  if (!/contact|email/i.test(text)) feedback.push('Add contact information');
  if (text.length < 500)            feedback.push('Resume seems short — add more detail');
  if (feedback.length === 0)        feedback.push('Great resume! All key sections present.');
  return feedback;
}