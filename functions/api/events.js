// /functions/api/events.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const email = url.searchParams.get('email');

    try {
        // If an email is provided, fetch events for that specific user
        if (email) {
            // First, find the client's ID from their email
            const client = await env.DB.prepare('SELECT id FROM Clients WHERE email = ?').bind(email).first();

            if (!client) {
                return jsonResponse([]); // No client found, return no events
            }

            // Now, fetch only the events this client has booked
            const { results } = await env.DB.prepare(`
                SELECT E.id, E.name, E.description, E.event_date, E.location, E.total_tickets, E.tickets_sold, E.image_url
                FROM Events AS E
                JOIN EventBookings AS EB ON E.id = EB.event_id
                WHERE EB.client_id = ?
                ORDER BY E.event_date DESC
            `).bind(client.id).all();

            return jsonResponse(results);
        } else {
            // If no email is provided, fetch all events (for A-Team dashboard, etc.)
            const { results } = await env.DB.prepare(
                'SELECT id, name, description, event_date, location, total_tickets, tickets_sold, image_url FROM Events ORDER BY event_date DESC'
            ).all();
            return jsonResponse(results);
        }
    } catch (e) {
        console.error("Error fetching events:", e);
        return jsonResponse({ message: 'An error occurred while fetching events.' }, { status: 500 });
    }
}