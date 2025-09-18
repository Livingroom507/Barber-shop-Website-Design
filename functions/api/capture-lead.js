
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * POST /api/capture-lead
 * Captures a lead from the Raven landing page.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, email, message } = await request.json();

        if (!name || !email) {
            return jsonResponse({ message: 'Name and email are required.' }, { status: 400 });
        }

        // Use INSERT OR IGNORE to prevent errors if the same email signs up again.
        await env.DB.prepare('INSERT OR IGNORE INTO Leads (name, email, message) VALUES (?, ?, ?)')
            .bind(name, email, message || '') // Use empty string if message is null/undefined
            .run();

        return jsonResponse({ message: 'Thank you for joining the Raven community!' }, { status: 200 });

    } catch (e) {
        console.error("Lead Capture Error:", e);
        return jsonResponse({ message: 'An error occurred.' }, { status: 500 });
    }
}
