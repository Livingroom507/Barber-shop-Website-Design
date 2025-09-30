-- Drop tables if they exist to allow for a clean slate on re-running the schema.
DROP TABLE IF EXISTS ProfileUpdateRequests;
DROP TABLE IF EXISTS EventBookings;
DROP TABLE IF EXISTS Affiliates;
DROP TABLE IF EXISTS Appointments;
DROP TABLE IF EXISTS Events;
DROP TABLE IF EXISTS Clients;
DROP TABLE IF EXISTS Leads;
DROP TABLE IF EXISTS ReferralRewards;
DROP TABLE IF EXISTS Waitlist;
DROP TABLE IF EXISTS ClientBadges;
DROP TABLE IF EXISTS Badges;
DROP TABLE IF EXISTS AuditLog;
DROP TABLE IF EXISTS Feedback;
DROP TABLE IF EXISTS Notifications;

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
  password TEXT NOT NULL,
  role TEXT DEFAULT 'USER',
  bio TEXT,
  profile_image_url TEXT,
  is_profile_public INTEGER DEFAULT 0,
  is_image_public INTEGER DEFAULT 0,
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
    tickets_sold INTEGER DEFAULT 0,
    image_url TEXT
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

-- To store profile update requests that require admin approval
CREATE TABLE ProfileUpdateRequests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    requested_changes TEXT NOT NULL, -- Stores a JSON object of the changes
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_id INTEGER, -- Admin who reviewed the request
    FOREIGN KEY (client_id) REFERENCES Clients(id),
    FOREIGN KEY (reviewer_id) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS MembershipRequests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewer_id INTEGER, -- Admin who reviewed the request
    FOREIGN KEY (reviewer_id) REFERENCES Clients(id)
);

CREATE TABLE IF NOT EXISTS RecruitmentApplications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    resume_url TEXT,
    photo_id_url TEXT,
    background_check_url TEXT,
    facebook_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    youtube_url TEXT,
    twitter_url TEXT,
    status TEXT DEFAULT 'PENDING', -- PENDING, REVIEWED, CONTACTED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);