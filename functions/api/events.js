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
    const { env, request } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) {
        return new Response(JSON.stringify({ message: "Email required" }), { status: 400 });
    }
    const user = await env.DB.prepare("SELECT id FROM Clients WHERE email = ?").bind(email).first();
    if (!user) {
        return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
    }
    const events = await env.DB.prepare(
        `SELECT Events.* FROM Events
         JOIN EventBookings ON Events.id = EventBookings.event_id
         WHERE EventBookings.client_id = ?`
    ).bind(user.id).all();
    return new Response(JSON.stringify(events.results), { headers: { "Content-Type": "application/json" } });
}
