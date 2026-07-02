// lambda/handler.js
const {
  TextractClient,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand
} = require('@aws-sdk/client-textract');
const { Client } = require('pg');

// Textract client
const textract = new TextractClient({
  region: process.env.AWS_REGION || 'ap-south-1'
});

// Create DB connection
const getDb = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
};

// ─── Main handler ─────────────────────────────────────
exports.handler = async (event) => {
  // Get bucket and file key from S3 event
  const record = event.Records[0];
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(
    record.s3.object.key.replace(/\+/g, ' ')
  );

  console.log(`Processing file: ${bucket}/${key}`);

  const db = await getDb();

  try {
    // Step 1: Update resume status to 'processing'
    await db.query(
      "UPDATE resumes SET status = 'processing' WHERE s3_key = $1",
      [key]
    );
    console.log('Status updated to: processing');

    // Step 2: Start Textract async job
    const startCmd = new StartDocumentTextDetectionCommand({
      DocumentLocation: {
        S3Object: { Bucket: bucket, Name: key }
      }
    });
    const { JobId } = await textract.send(startCmd);
    console.log('Textract JobId:', JobId);

    // Step 3: Poll until Textract finishes
    let result;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      // Wait 5 seconds between polls
      await new Promise(r => setTimeout(r, 5000));

      const getCmd = new GetDocumentTextDetectionCommand({ JobId });
      result = await textract.send(getCmd);

      console.log(`Poll ${attempts + 1}: ${result.JobStatus}`);

      if (result.JobStatus === 'SUCCEEDED') break;
      if (result.JobStatus === 'FAILED')
        throw new Error('Textract job failed');

      attempts++;
    }

    if (!result || result.JobStatus !== 'SUCCEEDED') {
      throw new Error('Textract timed out after 20 attempts');
    }

    // Step 4: Extract raw text from Textract response
    const rawText = result.Blocks
      .filter(b => b.BlockType === 'LINE')
      .map(b => b.Text)
      .join('\n');

    console.log('Extracted text length:', rawText.length);

    // Step 5: Parse the text
    const skills = extractSkills(rawText);
    const experienceYears = extractExperience(rawText);
    const score = calculateScore(rawText, skills);
    const feedback = generateFeedback(rawText, skills);

    console.log('Skills found:', skills);
    console.log('Experience years:', experienceYears);
    console.log('Score:', score);

    // Step 6: Save analysis to DB
    await db.query(
      `INSERT INTO analyses
        (resume_id, raw_text, skills, experience_years, score, feedback)
       SELECT id, $1, $2, $3, $4, $5
       FROM resumes WHERE s3_key = $6`,
      [
        rawText,
        JSON.stringify(skills),
        experienceYears,
        score,
        JSON.stringify(feedback),
        key
      ]
    );

    // Step 7: Update resume status to 'done'
    await db.query(
      "UPDATE resumes SET status = 'done' WHERE s3_key = $1",
      [key]
    );

    console.log('Analysis complete for:', key);

  } catch (err) {
    console.error('Lambda error:', err.message);

    // Update status to 'failed' so frontend can show error
    try {
      await db.query(
        "UPDATE resumes SET status = 'failed' WHERE s3_key = $1",
        [key]
      );
    } catch (dbErr) {
      console.error('Failed to update status to failed:', dbErr.message);
    }

    throw err; // Re-throw so CloudWatch logs the full error

  } finally {
    await db.end(); // Always close DB connection
  }
};

// ─── Helper: Extract skills ───────────────────────────
function extractSkills(text) {
  const skillsList = [
    // Languages
    'javascript', 'python', 'java', 'typescript', 'c++', 'c#',
    'ruby', 'go', 'rust', 'php', 'swift', 'kotlin',
    // Frontend
    'react', 'angular', 'vue', 'html', 'css', 'tailwind',
    'next.js', 'redux',
    // Backend
    'node', 'express', 'django', 'flask', 'spring', 'fastapi',
    // Databases
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'dynamodb',
    // Cloud & DevOps
    'aws', 'docker', 'kubernetes', 'git', 'linux', 'terraform',
    'ci/cd', 'jenkins',
    // Other
    'rest', 'graphql', 'api', 'microservices', 'agile'
  ];

  const lower = text.toLowerCase();
  return skillsList.filter(skill => lower.includes(skill));
}

// ─── Helper: Extract years of experience ─────────────
function extractExperience(text) {
  const matches = text.match(/(\d+)\s*(?:years?|yrs?)/gi);
  if (!matches) return 0;
  const nums = matches.map(m => parseInt(m));
  return Math.max(...nums);
}

// ─── Helper: Calculate score ──────────────────────────
function calculateScore(text, skills) {
  let score = 0;
  const lower = text.toLowerCase();

  if (text.length > 500)          score += 20; // Has content
  if (/education/i.test(text))    score += 20; // Has education section
  if (/experience/i.test(text))   score += 20; // Has experience section
  if (skills.length >= 3)         score += 20; // Has skills
  if (/project/i.test(text))      score += 10; // Has projects
  if (/contact|email|phone/i.test(text)) score += 10; // Has contact info

  return Math.min(score, 100); // Cap at 100
}

// ─── Helper: Generate feedback ────────────────────────
function generateFeedback(text, skills) {
  const feedback = [];

  if (!/education/i.test(text))
    feedback.push('Add an Education section');
  if (!/experience/i.test(text))
    feedback.push('Add a Work Experience section');
  if (skills.length < 3)
    feedback.push('List more technical skills');
  if (!/project/i.test(text))
    feedback.push('Add a Projects section to showcase your work');
  if (!/contact|email/i.test(text))
    feedback.push('Add contact information');
  if (text.length < 500)
    feedback.push('Your resume seems short — add more detail');

  if (feedback.length === 0)
    feedback.push('Great resume! All key sections are present.');

  return feedback;
}