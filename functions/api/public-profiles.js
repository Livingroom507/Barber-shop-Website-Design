// /functions/api/public-profiles.js

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
            'SELECT name, profile_image_url, created_at FROM Clients WHERE is_profile_public = 1 ORDER BY created_at DESC'
        ).all();
        return jsonResponse(results);
    } catch (e) {
        console.error("Error fetching public profiles:", e);
        return jsonResponse({ message: 'An error occurred while fetching profiles.' }, { status: 500 });
    }
}
