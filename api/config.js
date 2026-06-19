// Vercel Serverless Function to expose configuration environment variables to the client side.
export default function handler(req, res) {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({
        supabaseUrl: process.env.SUPABASE_URL || "",
        supabaseKey: process.env.SUPABASE_ANON_KEY || "",
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        googleClientId: process.env.GOOGLE_CLIENT_ID || ""
    });
}
