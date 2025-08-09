-- สร้างตาราง lessons
CREATE TABLE IF NOT EXISTS lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  youtube_url TEXT NOT NULL,
  video_id VARCHAR(50),
  description TEXT,
  category VARCHAR(100),
  duration VARCHAR(50) DEFAULT 'ไม่ระบุ',
  views INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้างตาราง students (สำหรับข้อมูลนักเรียนทั่วไป)
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0, -- จะถูกคำนวณจาก student_progress
  lessons_completed INTEGER DEFAULT 0, -- จะถูกคำนวณจาก student_progress
  total_lessons INTEGER DEFAULT 0, -- จะถูกคำนวณจาก lessons
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- สร้างตาราง student_progress สำหรับเก็บความคืบหน้าการเรียนของนักเรียนแต่ละคน
CREATE TABLE IF NOT EXISTS student_progress (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  watch_time INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

-- เพิ่มข้อมูลตัวอย่างในตาราง students (ถ้ายังไม่มี)
INSERT INTO students (name, progress, lessons_completed, total_lessons) VALUES
('สมชาย ใจดี', 0, 0, 0),
('สมหญิง รักเรียน', 0, 0, 0),
('วิชัย ขยัน', 0, 0, 0),
('มาลี เก่ง', 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- เพิ่มข้อมูลบทเรียนตัวอย่างในตาราง lessons (ถ้ายังไม่มี)
INSERT INTO lessons (title, youtube_url, video_id, description, category, duration, views, completion_rate) VALUES
('บทเรียนคณิตศาสตร์พื้นฐาน: จำนวนเต็ม', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'เรียนรู้เกี่ยวกับจำนวนเต็มและการดำเนินการพื้นฐาน', 'คณิตศาสตร์', '15:30', 1200, 75),
('ฟิสิกส์: กฎการเคลื่อนที่ของนิวตัน', 'https://www.youtube.com/watch?v=xyz123abcDE', 'xyz123abcDE', 'ทำความเข้าใจกฎสามข้อของนิวตันและตัวอย่างการประยุกต์ใช้', 'ฟิสิกส์', '20:00', 850, 60),
('เคมี: โครงสร้างอะตอม', 'https://www.youtube.com/watch?v=fgh456ijkLM', 'fgh456ijkLM', 'สำรวจส่วนประกอบของอะตอมและแบบจำลองอะตอมต่างๆ', 'เคมี', '18:45', 980, 80)
ON CONFLICT (id) DO NOTHING;

-- ไม่มี RLS policies เนื่องจากไม่มีระบบ Auth
