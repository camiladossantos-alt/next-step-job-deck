import test from 'node:test';
import assert from 'node:assert';
import handler from '../../../api/config.js';

test('TST-001 - api/config.js returns correctly and hides secret keys', async (t) => {
    // Save original env values
    const originalEnv = { ...process.env };

    // Mock environment variables
    process.env.SUPABASE_URL = 'https://mock-supabase.co';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
    process.env.GEMINI_API_KEY = 'secret-gemini-key';
    process.env.GOOGLE_CLIENT_ID = 'mock-google-client';

    let statusCode = null;
    let responseData = null;
    let headers = {};

    const req = {};
    const res = {
        setHeader(name, value) {
            headers[name] = value;
            return this;
        },
        status(code) {
            statusCode = code;
            return this;
        },
        json(data) {
            responseData = data;
            return this;
        }
    };

    handler(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(headers['Cache-Control'], 'no-store, max-age=0');
    assert.strictEqual(responseData.supabaseUrl, 'https://mock-supabase.co');
    assert.strictEqual(responseData.supabaseKey, 'mock-anon-key');
    assert.strictEqual(responseData.googleClientId, 'mock-google-client');
    assert.strictEqual(responseData.hasGeminiKey, true);
    // Crucial check: make sure geminiKey does not exist in response
    assert.strictEqual(responseData.geminiKey, undefined);

    // Reset env
    process.env = originalEnv;
});
