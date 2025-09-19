-- Drop tables if they exist to allow for a clean slate on re-running the schema.
DROP TABLE IF EXISTS EventBookings;
DROP TABLE IF EXISTS Affiliates;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Events;
DROP TABLE IF EXISTS Clients;
DROP TABLE IF EXISTS Leads;

-- To store information about your clients/users
CREATE TABLE Clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    referral_code TEXT NOT NULL UNIQUE,
    referred_by_id INTEGER, -- References another Client's id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by_id) REFERENCES Clients(id)
);

-- To store all haircut/service appointments
CREATE TABLE Appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'CONFIRMED', -- e.g., CONFIRMED, CANCELLED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

-- To store information about events
CREATE TABLE Events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    location TEXT,
    total_tickets INTEGER,
    tickets_sold INTEGER DEFAULT 0
);

-- To link clients to the events they've booked
CREATE TABLE EventBookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    event_id INTEGER NOT NULL,
    tickets_booked INTEGER NOT NULL,
    status TEXT DEFAULT 'CONFIRMED',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (event_id) REFERENCES Events(id)
);

-- To manage your affiliates
CREATE TABLE Affiliates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL UNIQUE, -- An affiliate is also a client
    affiliate_code TEXT NOT NULL UNIQUE,
    commission_rate REAL DEFAULT 0.10, -- 10% commission rate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

-- Table for capturing leads from the landing page
CREATE TABLE Leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index for faster lookups on appointment start times
CREATE INDEX idx_appointments_start_time ON Appointments(start_time);