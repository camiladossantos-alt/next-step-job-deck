import test from 'node:test';
import assert from 'node:assert';
import handler from '../../../api/gemini.js';

test('TST-002 - api/gemini.js proxy behaves correctly', async (t) => {
    const originalEnv = { ...process.env };
    process.env.GEMINI_API_KEY = 'secret-gemini-key';

    // Mock globalThis.fetch
    const originalFetch = globalThis.fetch;
    let fetchedUrl = '';
    let fetchedOptions = {};

    globalThis.fetch = async (url, options) => {
        fetchedUrl = url;
        fetchedOptions = options;
        return {
            ok: true,
            async json() {
                return { candidates: [{ content: { parts: [{ text: 'mock AI response' }] } }] };
            }
        };
    };

    // Sub-test 1: Rejects non-POST methods
    {
        const req = { method: 'GET' };
        let statusCode = null;
        let responseData = null;
        const res = {
            setHeader() {},
            status(code) { statusCode = code; return this; },
            json(data) { responseData = data; return this; }
        };
        await handler(req, res);
        assert.strictEqual(statusCode, 405);
    }

    // Sub-test 2: Rejects missing contents in body
    {
        const req = { method: 'POST', body: {} };
        let statusCode = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json() { return this; }
        };
        await handler(req, res);
        assert.strictEqual(statusCode, 400);
    }

    // Sub-test 3: Forwards request to Gemini API securely
    {
        const req = {
            method: 'POST',
            body: { contents: [{ parts: [{ text: 'compare resume' }] }] }
        };
        let statusCode = null;
        let responseData = null;
        const res = {
            status(code) { statusCode = code; return this; },
            json(data) { responseData = data; return this; }
        };
        await handler(req, res);
        assert.strictEqual(statusCode, 200);
        assert.ok(fetchedUrl.includes('https://generativelanguage.googleapis.com'));
        assert.ok(fetchedUrl.includes('key=secret-gemini-key'));
        assert.strictEqual(JSON.parse(fetchedOptions.body).contents[0].parts[0].text, 'compare resume');
        assert.strictEqual(responseData.candidates[0].content.parts[0].text, 'mock AI response');
    }

    // Restore globals
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
});
