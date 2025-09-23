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
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  referral_code TEXT,
  referred_by TEXT,
  membership_level TEXT DEFAULT 'STANDARD',
  loyalty_points INTEGER DEFAULT 0,
  role TEXT DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- To store all haircut/service appointments
CREATE TABLE Appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  service TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  status TEXT DEFAULT 'PENDING',
  recurrence TEXT,
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

CREATE TABLE Notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    type TEXT, -- e.g., 'APPOINTMENT', 'EVENT', 'GENERAL'
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE Feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    event_id INTEGER,
    appointment_id INTEGER,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (event_id) REFERENCES Events(id),
    FOREIGN KEY (appointment_id) REFERENCES Appointments(id)
);

CREATE TABLE AuditLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id)
);

CREATE TABLE Badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT
);

CREATE TABLE ClientBadges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (badge_id) REFERENCES Badges(id)
);

-- Waitlist for appointments/events
CREATE TABLE IF NOT EXISTS Waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    appointment_id INTEGER,
    event_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (appointment_id) REFERENCES Appointments(id),
    FOREIGN KEY (event_id) REFERENCES Events(id)
);

-- Recurring appointments
ALTER TABLE Appointments ADD COLUMN recurrence TEXT;

-- Referral rewards tracking
CREATE TABLE ReferralRewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_id INTEGER NOT NULL,
    reward_status TEXT DEFAULT 'PENDING',
    rewarded_at TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES Clients(id),
    FOREIGN KEY (referred_id) REFERENCES Clients(id)
);

-- User roles
ALTER TABLE Clients ADD COLUMN role TEXT DEFAULT 'USER';

-- Badges and client badges
CREATE TABLE ClientBadges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    badge_id INTEGER NOT NULL,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (badge_id) REFERENCES Badges(id)
);

-- Event categories
ALTER TABLE Events ADD COLUMN category TEXT;
ALTER TABLE Clients ADD COLUMN membership_level TEXT DEFAULT 'STANDARD';
ALTER TABLE Clients ADD COLUMN loyalty_points INTEGER DEFAULT 0;
ALTER TABLE Appointments ADD COLUMN recurrence TEXT; -- e.g., 'WEEKLY', 'MONTHLY'
ALTER TABLE Clients ADD COLUMN role TEXT DEFAULT 'USER'; -- USER, AFFILIATE, ADMIN






-- Commands to add columns for the new profile page features
ALTER TABLE Clients ADD COLUMN bio TEXT;
ALTER TABLE Clients ADD COLUMN profile_image_url TEXT;
ALTER TABLE Clients ADD COLUMN is_profile_public INTEGER DEFAULT 0; -- 0 for private, 1 for public
ALTER TABLE Clients ADD COLUMN is_image_public INTEGER DEFAULT 0; -- 0 for private, 1 for public
