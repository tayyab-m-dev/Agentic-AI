CREATE DATABASE IF NOT EXISTS northstar_learning;
USE northstar_learning;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student','admin','instructor') NOT NULL DEFAULT 'student',
  email_verified BOOLEAN NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  type ENUM('verify_email','reset_password') NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  tagline VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  outcomes JSON NOT NULL,
  curriculum JSON NOT NULL,
  instructor_name VARCHAR(120) NOT NULL,
  instructor_bio TEXT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  duration_label VARCHAR(50) NOT NULL,
  schedule_label VARCHAR(100) NOT NULL,
  mode VARCHAR(30) NOT NULL,
  level VARCHAR(30) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  discount_fee DECIMAL(10,2),
  next_batch DATE NOT NULL,
  seats_left INT NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS instructors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  bio TEXT NOT NULL,
  photo_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  starts_on DATE NOT NULL,
  schedule_label VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 20,
  status ENUM('open','full','completed','cancelled') NOT NULL DEFAULT 'open',
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  course_id INT NOT NULL,
  batch_id INT NULL,
  student_name VARCHAR(120) NOT NULL,
  student_email VARCHAR(180) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  payment_method VARCHAR(40) NOT NULL DEFAULT 'pay_later',
  status ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id),
  FOREIGN KEY (course_id) REFERENCES courses(id)
);

INSERT INTO courses (title, category, tagline, description, outcomes, curriculum, instructor_name, instructor_bio, image_url, duration_label, schedule_label, mode, level, fee, discount_fee, next_batch, seats_left, featured)
VALUES
('Digital Marketing', 'Marketing', 'Turn attention into momentum.', 'A practical studio for learning the systems behind modern growth: from the first scroll-stopping idea to a campaign you can measure.', '["Build a channel strategy that earns attention", "Launch and optimize paid social campaigns", "Read analytics and turn signals into decisions"]', '["Foundations & positioning", "Content systems & social", "Paid ads laboratory", "Email & retention", "Analytics, reporting & capstone"]', 'Ayesha Rahman', 'Growth strategist and mentor who has helped early-stage teams turn messy marketing into repeatable systems.', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85', '6 weeks', 'Tue & Thu · 7:00 PM', 'Live online', 'Beginner', 42000, 34000, '2026-10-12', 8, 1),
('SEO', 'Marketing', 'Make your best work findable.', 'Learn the technical and creative craft of SEO with a live project that takes a real site from invisible to intentional.', '["Research opportunities with confidence", "Fix technical and on-page issues", "Create an ethical growth roadmap"]', '["Search intent & keyword research", "On-page architecture", "Technical SEO clinic", "Authority & local search", "Measurement & strategy"]', 'Hamza Khan', 'Technical SEO lead and former agency consultant with a thing for clean information architecture.', 'https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?auto=format&fit=crop&w=1200&q=85', '5 weeks', 'Mon & Wed · 7:00 PM', 'Live online', 'Intermediate', 38000, 30000, '2026-10-19', 12, 1),
('Content Writing', 'Creative', 'Find your voice. Then get paid for it.', 'Write clear, persuasive content people actually want to read. Leave with a portfolio, a process, and the confidence to pitch.', '["Write for humans and search engines", "Edit with a sharper eye", "Package your work for freelance clients"]', '["Voice, clarity & structure", "Blogs that earn attention", "Conversion copywriting", "Editing & feedback", "Freelance foundations"]', 'Mariam Ali', 'Editorial director and writing coach who believes the best writing sounds like a person, not a brochure.', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=85', '4 weeks', 'Sat · 11:00 AM', 'Live online', 'Beginner', 28000, 22000, '2026-11-07', 16, 0),
('Web Development', 'Technology', 'Ship your first real thing.', 'A fundamentals-first build lab for turning ideas into responsive, deployed websites with HTML, CSS and JavaScript.', '["Build responsive interfaces from scratch", "Use JavaScript to make pages feel alive", "Deploy a polished project to the web"]', '["HTML & the web", "CSS systems & responsive layouts", "JavaScript essentials", "Build week", "Deploy, review & next steps"]', 'Omar Siddiqui', 'Product engineer and patient teacher who makes the web feel less mysterious, one shipped project at a time.', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=85', '8 weeks', 'Tue & Thu · 8:00 PM', 'Live online', 'Beginner', 52000, 42000, '2026-10-26', 5, 1);

INSERT INTO batches (course_id, starts_on, schedule_label, capacity)
SELECT c.id, c.next_batch, c.schedule_label, GREATEST(c.seats_left, 1)
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM batches b WHERE b.course_id = c.id AND b.starts_on = c.next_batch);
