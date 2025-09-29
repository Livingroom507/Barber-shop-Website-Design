// /functions/api/check-client.js

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

    if (!email) {
        return jsonResponse({ message: 'Email parameter is required.' }, { status: 400 });
    }

    try {
        const { results } = await env.DB.prepare('SELECT id FROM Clients WHERE email = ?').bind(email).all();
        const exists = results.length > 0;
        return jsonResponse({ exists });
    } catch (e) {
        console.error("Client check error:", e);
        return jsonResponse({ message: 'An error occurred while checking the client.' }, { status: 500 });
    }
}
