import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless function to proxy Google Maps API requests.
 * This solves the CORS issue by making requests from the server side.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Get API key from environment variable
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;

        if (!apiKey) {
            console.error('[Proxy] API key not configured in environment variables');
            return res.status(500).json({
                error: 'API key not configured',
                status: 'REQUEST_DENIED'
            });
        }

        // The Vercel rewrite sends requests like:
        // /api/google-proxy/maps/api/place/textsearch/json?key=...&query=...
        // We need to extract everything after /api/google-proxy
        const originalUrl = req.url || '';

        // Split URL into path and query
        const [fullPath, queryString] = originalUrl.split('?');

        // Remove /api/google-proxy prefix to get the Google API path
        // Example: /api/google-proxy/maps/api/place/textsearch/json -> /maps/api/place/textsearch/json
        const googleApiPath = fullPath.replace('/api/google-proxy', '') || '/maps/api/place/textsearch/json';

        // Reconstruct the full Google API URL
        let googleApiUrl = `https://maps.googleapis.com${googleApiPath}`;

        // Parse and update query parameters
        const queryParams = new URLSearchParams(queryString || '');

        // Replace the client's API key with the server's secure key
        queryParams.set('key', apiKey);

        googleApiUrl += `?${queryParams.toString()}`;

        console.log('[Proxy] Original URL:', originalUrl);
        console.log('[Proxy] Google API path:', googleApiPath);
        console.log('[Proxy] Forwarding to:', googleApiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

        // Make the request to Google API
        const response = await fetch(googleApiUrl, {
            method: req.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

        console.log('[Proxy] Response status:', response.status);
        console.log('[Proxy] Response data status:', data.status);

        // Return the response
        return res.status(response.status).json(data);

    } catch (error: any) {
        console.error('[Proxy] Error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error',
            status: 'UNKNOWN_ERROR'
        });
    }
}
