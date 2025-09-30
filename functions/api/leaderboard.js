// /functions/api/leaderboard.js

const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const eventId = url.searchParams.get('eventId');

    if (!eventId) {
        return jsonResponse({ message: 'eventId parameter is required.' }, { status: 400 });
    }

    try {
        const db = env.DB;
        const { results } = await db.prepare(`
            SELECT
                c.id as affiliateId,
                c.name AS affiliateName,
                COUNT(rr.id) AS referralCount
            FROM
                ReferralRewards rr
            JOIN
                Clients c ON rr.referrer_id = c.id
            JOIN
                EventBookings eb ON rr.referred_id = eb.client_id
            WHERE
                eb.event_id = ?
            GROUP BY
                rr.referrer_id, c.name
            ORDER BY
                referralCount DESC
        `).bind(eventId).all();

        // Add rank to the results
        const rankedResults = results.map((row, index) => ({
            rank: index + 1,
            ...row,
        }));

        return jsonResponse(rankedResults);

    } catch (e) {
        console.error("Leaderboard Error:", e);
        return jsonResponse({ message: 'An error occurred while fetching the leaderboard.' }, { status: 500 });
    }
}
