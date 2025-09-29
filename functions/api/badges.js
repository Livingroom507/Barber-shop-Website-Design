// /functions/api/badges.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const clientId = url.searchParams.get('clientId');

    if (!clientId) {
        return jsonResponse({ message: 'clientId parameter is required.' }, { status: 400 });
    }

    try {
        const db = env.DB;
        const { results } = await db.prepare(`
            SELECT
                b.name,
                b.description
            FROM
                ClientBadges cb
            JOIN
                Badges b ON cb.badge_id = b.id
            WHERE
                cb.client_id = ?
        `).bind(clientId).all();

        return jsonResponse(results);

    } catch (e) {
        console.error("Badges Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching badges.' }, { status: 500 });
    }
}
