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
            return res.status(500).json({
                error: 'API key not configured',
                status: 'REQUEST_DENIED'
            });
        }

        // Extract the original path from the request
        const originalUrl = req.url || '';

        // Remove /api/google-proxy prefix and get the actual Google API path
        // Example: /api/google-proxy?url=/maps/api/place/textsearch/json&key=...
        const urlParams = new URL(originalUrl, `https://${req.headers.host}`);
        const targetPath = urlParams.pathname.replace('/api/google-proxy', '');

        // Reconstruct the full Google API URL
        let googleApiUrl = `https://maps.googleapis.com${targetPath}`;

        // Add query parameters
        const queryParams = new URLSearchParams(urlParams.search);

        // Replace the client's API key with the server's secure key
        queryParams.set('key', apiKey);

        googleApiUrl += `?${queryParams.toString()}`;

        console.log('[Proxy] Forwarding request to:', googleApiUrl.replace(apiKey, 'API_KEY_HIDDEN'));

        // Make the request to Google API
        const response = await fetch(googleApiUrl, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();

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
