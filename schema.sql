-- Drop tables if they exist to allow for a clean slate on re-running the schema.
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Clients;
DROP TABLE IF EXISTS Leads;

-- Table for storing client information
CREATE TABLE Clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    referral_code TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table for storing appointment information
CREATE TABLE Appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    service_name TEXT NOT NULL,
    start_time DATETIME NOT NULL UNIQUE,
    end_time DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

-- Table for capturing leads from the landing pagecd
CREATE TABLE Leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create an index for faster lookups on appointment start times
CREATE INDEX idx_appointments_start_time ON Appointments(start_time);
