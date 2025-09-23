
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * GET /api/appointments
 * Fetches a list of appointments for the currently authenticated user.
 */
export async function onRequestGet(context) {
    const { env, data } = context;

    // Assumes authentication middleware
    if (!data.user || !data.user.id) {
        return jsonResponse({ message: 'Authentication required.' }, { status: 401 });
    }

    const userId = data.user.id;

    try {
        // Fetch all appointments for the given client_id
        const { results } = await env.DB.prepare(
            'SELECT service, start_time FROM Appointments WHERE client_id = ? ORDER BY start_time DESC'
        ).bind(userId).all();

        return jsonResponse(results || []);

    } catch (e) {
        console.error("Appointments Fetch Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching appointments.' }, { status: 500 });
    }
}
