
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * GET /api/events
 * Fetches a list of event bookings for the currently authenticated user.
 */
export async function onRequestGet(context) {
    const { env, data } = context;

    // Assumes authentication middleware
    if (!data.user || !data.user.id) {
        return jsonResponse({ message: 'Authentication required.' }, { status: 401 });
    }

    const userId = data.user.id;

    try {
        // Fetch all event bookings for the given client_id
        // This query joins EventBookings with Events to get the event name and date
        const { results } = await env.DB.prepare(`
            SELECT
                e.name,
                e.event_date
            FROM EventBookings AS eb
            JOIN Events AS e ON eb.event_id = e.id
            WHERE eb.client_id = ?
            ORDER BY e.event_date DESC
        `).bind(userId).all();

        return jsonResponse(results || []);

    } catch (e) {
        console.error("Event Bookings Fetch Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching event bookings.' }, { status: 500 });
    }
}
