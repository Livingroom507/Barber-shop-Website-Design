// Helper function for consistent JSON responses
const jsonResponse = (data, options = {}) => {
    return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
};

// Helper function to hash a password
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}


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
        const { clientName, clientEmail, service, appointmentTime, password } = await request.json();

        if (!clientName || !clientEmail || !service || !appointmentTime) {
            return jsonResponse({ message: 'Missing required fields.' }, { status: 400 });
        }

        // 1. Find or create the client
        let client;
        const { results } = await env.DB.prepare('SELECT id, role FROM Clients WHERE email = ?').bind(clientEmail).all();
        if (results.length > 0) {
            client = results[0];
            if (client.role === 'USER') {
                await env.DB.prepare('UPDATE Clients SET role = \'CLIENT\' WHERE id = ?').bind(client.id).run();
            }
        } else {
            // If client is new, password is required
            if (!password) {
                return jsonResponse({ message: 'Password is required for new clients.' }, { status: 400 });
            }

            // Create a new client with a unique referral code and a hashed password
            const referralCode = `REF-${Date.now()}${Math.random().toString(36).substring(2, 6)}`;
            const hashedPassword = await hashPassword(password);
            const { meta } = await env.DB.prepare('INSERT INTO Clients (name, email, password, referral_code, role) VALUES (?, ?, ?, ?, \'CLIENT\');')
                .bind(clientName, clientEmail, hashedPassword, referralCode)
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

        // Send confirmation email
        try {
            const emailHtml = `
                <h1>Your Appointment is Confirmed!</h1>
                <p>Hi ${clientName},</p>
                <p>This is a confirmation for your upcoming appointment.</p>
                <ul>
                    <li><strong>Service:</strong> ${service}</li>
                    <li><strong>Date:</strong> ${startTime.toLocaleDateString()}</li>
                    <li><strong>Time:</strong> ${startTime.toLocaleTimeString()}</li>
                </ul>
                <p>We look forward to seeing you!</p>
            `;
            await sendEmail({
                to: clientEmail,
                from: 'noreply@yourdomain.com', // Replace with your sender email
                subject: 'Your Appointment is Confirmed!',
                text: `Your appointment for ${service} on ${startTime.toLocaleString()} is confirmed.`,
                html: emailHtml,
                env: env
            });
        } catch (emailError) {
            console.error("Failed to send confirmation email:", emailError);
            // Non-critical error: Don't block the booking confirmation, just log the email failure.
        }

        return jsonResponse({ message: `Appointment confirmed for ${clientName} on ${startTime.toDateString()} at ${startTime.toLocaleTimeString()}. An email confirmation has been sent.` }, { status: 200 });

    } catch (e) {
        console.error("Booking Error:", e);
        if (e.cause?.message?.includes('UNIQUE constraint failed')) {
             return jsonResponse({ message: 'A booking conflict occurred. This can happen if the email is already in use with a different name.' }, { status: 409 });
        }
        return jsonResponse({ message: 'An error occurred during booking.' }, { status: 500 });
    }
}
