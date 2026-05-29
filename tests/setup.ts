import { config } from 'dotenv';

// Load environment variables for tests
config();

// Verify Azure Maps API key is set for integration tests
if (process.env.AZURE_MAPS_API_KEY) {
  console.log('✅ Azure Maps API key detected');
} else {
  console.warn('⚠️  AZURE_MAPS_API_KEY not set - integration tests will be skipped');
}
