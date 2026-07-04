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

  console.log('Processing file:', bucket + '/' + key);
  const db = await getDb();

  try {
    const resumeResult = await db.query(
      'SELECT id, s3_key, status FROM resumes WHERE s3_key = $1',
      [key]
    );

    if (resumeResult.rows.length === 0) {
      const allResumes = await db.query(
        'SELECT id, s3_key FROM resumes ORDER BY created_at DESC LIMIT 5'
      );
      console.log('Latest resumes in DB:', JSON.stringify(allResumes.rows));
      throw new Error('No resume found with s3_key: ' + key);
    }

    const resumeId = resumeResult.rows[0].id;
    console.log('Found resume ID:', resumeId);

    await db.query(
      'UPDATE resumes SET status = $1 WHERE id = $2',
      ['processing', resumeId]
    );

    const s3Response = await s3.send(new GetObjectCommand({
      Bucket: bucket, Key: key
    }));
    const pdfBuffer = await streamToBuffer(s3Response.Body);
    console.log('PDF downloaded, size:', pdfBuffer.length);

    const rawText = await extractTextFromPDF(pdfBuffer);
    console.log('Text extracted, length:', rawText.length);

    const skills = extractSkills(rawText);
    const experienceYears = extractExperience(rawText);
    const education = extractEducation(rawText);
    const score = calculateScore(rawText, skills, education);
    const feedback = generateFeedback(rawText, skills, education, experienceYears);
    const strengths = generateStrengths(rawText, skills, education);
    const improvements = generateImprovements(rawText, skills);
    const keywords = extractKeywords(rawText);

    console.log('Skills:', skills);
    console.log('Score:', score);
    console.log('Education:', education);

    await db.query(
      'DELETE FROM analyses WHERE resume_id = $1',
      [resumeId]
    );

    await db.query(
      `INSERT INTO analyses
        (resume_id, raw_text, skills, experience_years, score, feedback)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        resumeId,
        rawText,
        JSON.stringify({
          skills,
          education,
          keywords,
          strengths,
          improvements
        }),
        experienceYears,
        score,
        JSON.stringify(feedback)
      ]
    );

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
  const categories = {
    languages: ['javascript','python','java','typescript','c++','c#','ruby','go','php','swift','kotlin','scala','rust','r','matlab'],
    frontend: ['react','angular','vue','html','css','tailwind','bootstrap','nextjs','gatsby','redux','webpack','sass','jquery'],
    backend: ['node','express','django','flask','spring','fastapi','laravel','rails','nestjs','graphql','rest','api'],
    databases: ['sql','postgresql','mysql','mongodb','redis','dynamodb','firebase','sqlite','oracle','cassandra','elasticsearch'],
    cloud: ['aws','azure','gcp','docker','kubernetes','terraform','ansible','jenkins','gitlab','github','ci/cd','devops'],
    tools: ['git','linux','bash','jira','confluence','figma','postman','swagger','nginx','apache']
  };

  const lower = text.toLowerCase();
  const found = {};

  Object.entries(categories).forEach(([category, skills]) => {
    const foundInCategory = skills.filter(s => lower.includes(s));
    if (foundInCategory.length > 0) found[category] = foundInCategory;
  });

  return found;
}

function extractEducation(text) {
  const degrees = {
    phd: /ph\.?d|doctorate|doctoral/i,
    masters: /master|m\.tech|m\.e\.|mba|m\.sc|m\.s\b/i,
    bachelors: /bachelor|b\.tech|b\.e\.|b\.sc|b\.s\b|undergraduate|degree/i,
    diploma: /diploma|certificate|certification/i
  };

  const institutions = [];
  const lines = text.split('\n');

  lines.forEach(line => {
    if (/university|college|institute|school|iit|nit|bits/i.test(line)) {
      institutions.push(line.trim().substring(0, 100));
    }
  });

  let highestDegree = 'Not detected';
  if (degrees.phd.test(text)) highestDegree = 'PhD / Doctorate';
  else if (degrees.masters.test(text)) highestDegree = 'Masters Degree';
  else if (degrees.bachelors.test(text)) highestDegree = 'Bachelors Degree';
  else if (degrees.diploma.test(text)) highestDegree = 'Diploma / Certificate';

  return {
    highestDegree,
    institutions: institutions.slice(0, 3)
  };
}

function extractExperience(text) {
  const matches = text.match(/(\d+)\s*(?:\+\s*)?(?:years?|yrs?)/gi);
  if (!matches) return 0;
  return Math.max(...matches.map(m => parseInt(m)));
}

function extractKeywords(text) {
  const important = [
    'leadership','teamwork','communication','problem solving','agile','scrum',
    'machine learning','artificial intelligence','data analysis','cloud computing',
    'microservices','system design','open source','full stack','mobile development',
    'web development','database design','api development','testing','debugging'
  ];
  const lower = text.toLowerCase();
  return important.filter(k => lower.includes(k));
}

function calculateScore(text, skills, education) {
  let score = 0;
  const lower = text.toLowerCase();

  // Content length (0-10)
  if (text.length > 2000) score += 10;
  else if (text.length > 1000) score += 7;
  else if (text.length > 500) score += 4;

  // Sections present (0-30)
  if (/education/i.test(text)) score += 8;
  if (/experience|work history|employment/i.test(text)) score += 10;
  if (/skill|technical/i.test(text)) score += 7;
  if (/project/i.test(text)) score += 5;

  // Skills variety (0-20)
  const totalSkills = Object.values(skills).flat().length;
  if (totalSkills >= 15) score += 20;
  else if (totalSkills >= 10) score += 15;
  else if (totalSkills >= 5) score += 10;
  else if (totalSkills >= 3) score += 5;

  // Education (0-15)
  if (education.highestDegree === 'PhD / Doctorate') score += 15;
  else if (education.highestDegree === 'Masters Degree') score += 12;
  else if (education.highestDegree === 'Bachelors Degree') score += 10;
  else if (education.highestDegree === 'Diploma / Certificate') score += 5;

  // Contact info (0-10)
  if (/contact|email|phone|linkedin|github/i.test(text)) score += 10;

  // Achievements/metrics (0-15)
  if (/\d+%|\$\d+|increased|decreased|improved|achieved|delivered|led|managed/i.test(text)) score += 15;

  return Math.min(score, 100);
}

function generateStrengths(text, skills, education) {
  const strengths = [];
  const totalSkills = Object.values(skills).flat().length;

  if (totalSkills >= 10) strengths.push('Strong technical skill set with ' + totalSkills + ' skills listed');
  if (education.highestDegree !== 'Not detected') strengths.push('Educational qualification: ' + education.highestDegree);
  if (/project/i.test(text)) strengths.push('Projects section demonstrates practical experience');
  if (/achievement|award|honor|recognition/i.test(text)) strengths.push('Achievements and recognition highlighted');
  if (/github|portfolio|linkedin/i.test(text)) strengths.push('Online presence and portfolio links included');
  if (/\d+%|\$\d+/i.test(text)) strengths.push('Quantified achievements with numbers and metrics');
  if (skills.cloud && skills.cloud.length > 0) strengths.push('Cloud technology experience: ' + skills.cloud.join(', '));
  if (text.length > 1500) strengths.push('Detailed and comprehensive resume content');

  return strengths.length > 0 ? strengths : ['Resume has basic structure in place'];
}

function generateImprovements(text, skills) {
  const improvements = [];

  if (!/linkedin/i.test(text)) improvements.push('Add your LinkedIn profile URL to increase credibility');
  if (!/github|portfolio/i.test(text)) improvements.push('Include GitHub profile or portfolio link to showcase your work');
  if (!skills.cloud || skills.cloud.length === 0) improvements.push('Add cloud skills (AWS, Azure, or GCP) — highly in demand');
  if (!/\d+%|\$\d+/i.test(text)) improvements.push('Quantify your achievements — use numbers and percentages (e.g. "Improved performance by 40%")');
  if (!/summary|objective|profile/i.test(text)) improvements.push('Add a professional summary at the top to grab attention');
  if (Object.values(skills).flat().length < 8) improvements.push('Expand your skills section — list more relevant technical skills');
  if (!/volunteer|community|open source/i.test(text)) improvements.push('Add volunteer work or open source contributions');
  if (text.length < 1000) improvements.push('Your resume is too short — add more detail to each section');

  return improvements;
}

function generateFeedback(text, skills, education, experienceYears) {
  const feedback = [];

  if (!/education/i.test(text)) feedback.push('MISSING: Add an Education section with your degree and institution');
  if (!/experience|work history/i.test(text)) feedback.push('MISSING: Add Work Experience section with job titles and responsibilities');
  if (!/skill/i.test(text)) feedback.push('MISSING: Add a dedicated Skills section');
  if (!/project/i.test(text)) feedback.push('SUGGESTED: Add a Projects section to showcase practical work');
  if (!/contact|email|phone/i.test(text)) feedback.push('MISSING: Add contact information (email, phone, location)');
  if (!/summary|objective/i.test(text)) feedback.push('SUGGESTED: Add a professional summary (2-3 lines about yourself)');
  if (!/achievement|accomplishment|award/i.test(text)) feedback.push('SUGGESTED: Highlight key achievements and awards');
  if (!/linkedin/i.test(text)) feedback.push('SUGGESTED: Add LinkedIn profile URL');
  if (Object.values(skills).flat().length < 5) feedback.push('LOW: Skills section needs more technical skills listed');
  if (text.length < 800) feedback.push('WARNING: Resume content seems too brief — aim for at least 400 words');

  if (feedback.length === 0) {
    feedback.push('Excellent! Your resume covers all key sections');
    feedback.push('Consider adding more quantified achievements to stand out');
    feedback.push('Keep your resume updated with latest projects and skills');
  }

  return feedback;
}
