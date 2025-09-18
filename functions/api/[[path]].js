// A lightweight router for Cloudflare Workers
import { Router } from 'itty-router';

const router = Router({ base: '/api' });

// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};
// Helper function to get business hours and slot duration
function getBusinessConfig() {
    return {
        openHour: 6, // 6am
        closeHour: 22, // 10pm (22:00)
        slotDurationMinutes: 60, // Each appointment is 60 minutes
    };
}

/**
 * GET /api/availability?date=YYYY-MM-DD
 * Returns a list of available time slots for a given date.
 */
router.get('/availability', async (request, env) => {
    // Add a check to ensure the D1 Database is bound.
    if (!env.DB) {
        console.error("D1 Database binding not found. Please set up the 'DB' binding in your Cloudflare dashboard's Pages settings.");
        return jsonResponse({ message: 'Database not connected.' }, { status: 500 });
    }

    const { date } = request.query;
    if (!date) {
        return jsonResponse({ message: 'Date query parameter is required.' }, { status: 400 });
    }

    const { openHour, closeHour } = getBusinessConfig();
    const requestedDate = new Date(date + 'T00:00:00Z'); // Treat date as UTC

    try {
        // 1. Get all existing appointments for the requested date from D1 using a more robust range query.
        // This avoids potential issues with the date() function and timezones.
        const dayStart = date + "T00:00:00Z";
        const dayEnd = date + "T23:59:59Z";
        const query = 'SELECT start_time FROM Appointments WHERE start_time BETWEEN ? AND ?';
        const { results } = await env.DB.prepare(query).bind(dayStart, dayEnd).all();
        const bookedTimes = new Set(results.map(r => new Date(r.start_time).getUTCHours()));

        // 2. Generate all possible slots for the day
        const availableSlots = [];
        for (let hour = openHour; hour < closeHour; hour++) {
            // Check if the slot is in the future and not already booked
            const now = new Date();
            const slotTime = new Date(requestedDate);
            slotTime.setUTCHours(hour);

            if (slotTime > now && !bookedTimes.has(hour)) {
                // Format as "HH:MM"
                availableSlots.push(`${String(hour).padStart(2, '0')}:00`);
            }
        }

        return jsonResponse(availableSlots);
    } catch (e) {
        console.error("Availability Error:", e);
        // Return the actual database error message to the client for debugging.
        return jsonResponse({ message: e.cause?.message || e.message || 'Error fetching availability.' }, { status: 500 });
    }
});

/**
 * POST /api/book-appointment
 * Creates a new appointment in the database.
 */
router.post('/book-appointment', async (request, env) => {
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

        await env.DB.prepare('INSERT INTO Appointments (client_id, service_name, start_time, end_time) VALUES (?, ?, ?, ?)')
            .bind(client.id, service, startTime.toISOString(), endTime.toISOString())
            .run();
        
        // TODO: Send a notification email to yourself and the client.
        // You can use a service like MailChannels (free with Cloudflare) or SendGrid.

        return jsonResponse({ message: `Appointment confirmed for ${clientName} on ${startTime.toDateString()} at ${startTime.toLocaleTimeString()}.` }, { status: 200 });

    } catch (e) {
        console.error("Booking Error:", e);
        if (e.cause?.message?.includes('UNIQUE constraint failed')) {
             return jsonResponse({ message: 'A booking conflict occurred. This can happen if the email is already in use with a different name.' }, { status: 409 });
        }
        return jsonResponse({ message: 'An error occurred during booking.' }, { status: 500 });
    }
});

/**
 * POST /api/capture-lead
 * Captures a lead from the Raven landing page.
 */
router.post('/capture-lead', async (request, env) => {
    try {
        const { name, email, message } = await request.json();

        if (!name || !email) {
            return jsonResponse({ message: 'Name and email are required.' }, { status: 400 });
        }

        // Use INSERT OR IGNORE to prevent errors if the same email signs up again.
        await env.DB.prepare('INSERT OR IGNORE INTO Leads (name, email, message) VALUES (?, ?, ?)')
            .bind(name, email, message || '') // Use empty string if message is null/undefined
            .run();

        return jsonResponse({ message: 'Thank you for joining the Raven community!' }, { status: 200 });

    } catch (e) {
        console.error("Lead Capture Error:", e);
        return jsonResponse({ message: 'An error occurred.' }, { status: 500 });
    }
});


// Fallback for all other requests
router.all('*', (request) => jsonResponse({ message: `Not Found: ${request.method} ${request.url}` }, { status: 404 }));

// Export the handler for Cloudflare Pages Functions
export function onRequest(context) {
    return router.handle(context.request, context.env, context);
}
