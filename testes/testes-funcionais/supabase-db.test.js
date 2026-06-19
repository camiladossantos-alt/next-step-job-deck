import test from 'node:test';
import assert from 'node:assert';

// Mock browser global environment and window.supabase before importing production module
globalThis.window = {
    supabase: {
        createClient(url, key) {
            return {
                auth: {
                    async getUser() {
                        return { data: { user: { id: 'mock-user-uuid' } } };
                    }
                },
                from(table) {
                    return {
                        select(fields) {
                            return {
                                eq(col, val) {
                                    return {
                                        async maybeSingle() {
                                            if (table === 'profiles') {
                                                return {
                                                    data: {
                                                        user_id: 'mock-user-uuid',
                                                        provider: 'gemini',
                                                        gemini_key: 'mock-gemini-key-db',
                                                        ollama_host: 'http://localhost:11434',
                                                        ollama_model: 'gemma2',
                                                        master_resume: 'mock-resume-text'
                                                    },
                                                    error: null
                                                };
                                            }
                                            return { data: null, error: null };
                                        }
                                    };
                                }
                            };
                        },
                        upsert(payload) {
                            return {
                                select() {
                                    return {
                                        data: [payload],
                                        error: null
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    }
};

// Now import SupabaseDB
import { SupabaseDB } from '../../js/supabase-db.js';

test('TST-003 - SupabaseDB operations and mapping', async (t) => {
    // Initialize client
    const initResult = SupabaseDB.init('https://mock.supabase.co', 'mock-key');
    assert.strictEqual(initResult, true);
    assert.strictEqual(SupabaseDB.isInitialized(), true);

    // Test getProfile mapping (snake_case from database to camelCase for app)
    const profile = await SupabaseDB.getProfile();
    assert.ok(profile);
    assert.strictEqual(profile.provider, 'gemini');
    assert.strictEqual(profile.geminiKey, 'mock-gemini-key-db');
    assert.strictEqual(profile.ollamaHost, 'http://localhost:11434');
    assert.strictEqual(profile.ollamaModel, 'gemma2');
    assert.strictEqual(profile.masterResume, 'mock-resume-text');

    // Test saveProfile mapping (camelCase from app to snake_case for database)
    const savedData = await SupabaseDB.saveProfile({
        provider: 'ollama',
        geminiKey: 'user-gemini-key',
        ollamaHost: 'http://custom-ollama:11434',
        ollamaModel: 'llama3',
        masterResume: 'my new resume'
    });

    assert.ok(savedData);
    assert.strictEqual(savedData.user_id, 'mock-user-uuid');
    assert.strictEqual(savedData.provider, 'ollama');
    assert.strictEqual(savedData.gemini_key, 'user-gemini-key');
    assert.strictEqual(savedData.ollama_host, 'http://custom-ollama:11434');
    assert.strictEqual(savedData.ollama_model, 'llama3');
    assert.strictEqual(savedData.master_resume, 'my new resume');
});
