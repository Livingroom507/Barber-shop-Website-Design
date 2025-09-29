// /functions/api/events.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const { results } = await env.DB.prepare(
            'SELECT id, name, description, event_date, location, total_tickets, tickets_sold FROM Events ORDER BY event_date DESC'
        ).all();
        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching events:", e);
        return jsonResponse({ message: 'An error occurred while fetching events.' }, { status: 500 });
    }
}