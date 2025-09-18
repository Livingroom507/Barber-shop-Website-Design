
// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Helper function to get business hours
function getBusinessConfig() {
    return {
        openHour: 6, // 6am
        closeHour: 22, // 10pm (22:00)
    };
}

// This function will be the handler for GET requests to /api/availability
export async function onRequestGet(context) {
    const { request, env } = context;

    if (!env.DB) {
        console.error("D1 Database binding not found.");
        return jsonResponse({ message: 'Database not connected.' }, { status: 500 });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get('date');

    if (!date) {
        return jsonResponse({ message: 'Date query parameter is required.' }, { status: 400 });
    }

    const { openHour, closeHour } = getBusinessConfig();
    const requestedDate = new Date(date + 'T00:00:00Z'); // Treat date as UTC

    try {
        const dayStart = date + "T00:00:00Z";
        const dayEnd = date + "T23:59:59Z";
        const query = 'SELECT start_time FROM Appointments WHERE start_time BETWEEN ? AND ?';
        const { results } = await env.DB.prepare(query).bind(dayStart, dayEnd).all();
        const bookedTimes = new Set(results.map(r => new Date(r.start_time).getUTCHours()));

        const availableSlots = [];
        for (let hour = openHour; hour < closeHour; hour++) {
            const now = new Date();
            const slotTime = new Date(requestedDate);
            slotTime.setUTCHours(hour);

            if (slotTime > now && !bookedTimes.has(hour)) {
                availableSlots.push(`${String(hour).padStart(2, '0')}:00`);
            }
        }

        return jsonResponse(availableSlots);
    } catch (e) {
        console.error("Availability Error:", e);
        return jsonResponse({ message: e.cause?.message || e.message || 'Error fetching availability.' }, { status: 500 });
    }
}
