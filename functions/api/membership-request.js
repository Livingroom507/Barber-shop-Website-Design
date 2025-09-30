// /functions/api/membership-request.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * POST /api/membership-request
 * Submits a request to join the Raven community.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, email, message } = await request.json();

        if (!name || !email) {
            return jsonResponse({ message: 'Name and email are required.' }, { status: 400 });
        }

        // Use INSERT OR IGNORE to prevent errors if the same email submits a request again.
        await env.DB.prepare('INSERT OR IGNORE INTO MembershipRequests (name, email, message) VALUES (?, ?, ?)')
            .bind(name, email, message || '')
            .run();

        return jsonResponse({ message: 'Your request to join the Raven community has been submitted for approval!' }, { status: 200 });

    } catch (e) {
        console.error("Membership Request Error:", e);
        return jsonResponse({ message: 'An error occurred while submitting your request.' }, { status: 500 });
    }
}
