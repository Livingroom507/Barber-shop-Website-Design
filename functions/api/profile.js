// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

/**
 * GET /api/profile
 * Fetches the profile information for the currently authenticated user.
 */
export async function onRequestGet(context) {
    const { env, request } = context;
    // For now, get email from query string (e.g., /api/profile?email=...)
    const url = new URL(request.url);
    const email = url.searchParams.get('email');
    if (!email) {
        return new Response(JSON.stringify({ message: "Email required" }), { status: 400 });
    }
    const user = await env.DB.prepare(
        "SELECT id, name, email, bio, profile_image_url, is_profile_public, is_image_public FROM Clients WHERE email = ?"
    ).bind(email).first();
    if (!user) {
        return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
    }
    return new Response(JSON.stringify(user), { headers: { "Content-Type": "application/json" } });
}
