const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-south-1' });

const loadSecrets = async () => {
  // Only load from Secrets Manager in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Dev mode: using .env file for secrets');
    return;
  }

  try {
    const command = new GetSecretValueCommand({
      SecretId: 'resume-analyzer/production'
    });
    const response = await client.send(command);
    const secrets = JSON.parse(response.SecretString);

    // Inject into process.env
    Object.entries(secrets).forEach(([key, value]) => {
      process.env[key] = value;
    });

    console.log('Secrets loaded from AWS Secrets Manager');
  } catch (err) {
    console.error('Failed to load secrets:', err.message);
    console.log('Falling back to environment variables');
  }
};

module.exports = { loadSecrets };