// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Helper function to get business configuration
function getBusinessConfig() {
    return {
        slotDurationMinutes: 60, // Each appointment is 60 minutes
    };
}

/**
 * POST /api/book-appointment
 * Creates a new appointment in the database.
 */
export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { clientName, clientEmail, service, appointmentTime } = await request.json();

        if (!clientName || !clientEmail || !service || !appointmentTime) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        // 1. Find or create the client
        let client;
        const { results } = await env.DB.prepare('SELECT id FROM Clients WHERE email = ?').bind(clientEmail).all();
        if (results.length > 0) {
            client = results[0];
        } else {
            // Create a new client with a unique referral code
            const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
            const { meta } = await env.DB.prepare('INSERT INTO Clients (name, email, referral_code) VALUES (?, ?, ?);')
                .bind(clientName, clientEmail, referralCode)
                .run();
            client = { id: meta.last_row_id };
        }

        // 2. Insert the appointment
        const startTime = new Date(appointmentTime);
        const endTime = new Date(startTime.getTime() + getBusinessConfig().slotDurationMinutes * 60 * 1000);

        // Explicitly check for a double booking before attempting to insert
        const existingAppointment = await env.DB.prepare('SELECT id FROM Appointments WHERE start_time = ?').bind(startTime.toISOString()).first();
        if (existingAppointment) {
            return jsonResponse({ message: 'This time slot was just booked. Please select another time.' }, { status: 409 }); // 409 Conflict
        }

        await env.DB.prepare('INSERT INTO Appointments (client_id, service, start_time, end_time) VALUES (?, ?, ?, ?)')
            .bind(client.id, service, startTime.toISOString(), endTime.toISOString())
            .run();

        return jsonResponse({ message: `Appointment confirmed for ${clientName} on ${startTime.toDateString()} at ${startTime.toLocaleTimeString()}.` }, { status: 200 });

    } catch (e) {
        console.error("Booking Error:", e);
        if (e.cause?.message?.includes('UNIQUE constraint failed')) {
             return jsonResponse({ message: 'A booking conflict occurred. This can happen if the email is already in use with a different name.' }, { status: 409 });
        }
        return jsonResponse({ message: 'An error occurred during booking.' }, { status: 500 });
    }
}