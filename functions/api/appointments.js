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
    const appointments = await env.DB.prepare(
        "SELECT * FROM Appointments WHERE client_id = ?"
    ).bind(user.id).all();
    return new Response(JSON.stringify(appointments.results), { headers: { "Content-Type": "application/json" } });
}
