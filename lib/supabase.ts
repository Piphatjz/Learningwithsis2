import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database helpers
export const db = {
  // ดึงบทเรียนทั้งหมด
  getAllLessons: async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) console.error('Supabase Get All Lessons Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Get All Lessons error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการดึงบทเรียน' } }
    }
  },

  // เพิ่มบทเรียนใหม่
  addLesson: async (lesson: any) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert([lesson])
        .select()
        .single()
      if (error) console.error('Supabase Add Lesson Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Add Lesson error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการเพิ่มบทเรียน' } }
    }
  },

  // ดึงข้อมูลนักเรียนทั้งหมดจากตาราง students
  getAllStudents: async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
      if (error) console.error('Supabase Get All Students Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Get All Students error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน' } }
    }
  },

  // ดึงความคืบหน้าของนักเรียนคนใดคนหนึ่ง
  getStudentProgress: async (studentId: number) => {
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', studentId)
      if (error) console.error('Supabase Get Student Progress Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Get Student Progress error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการดึงความคืบหน้าของนักเรียน' } }
    }
  },

  // ดึงความคืบหน้าของนักเรียนทั้งหมด (สำหรับติวเตอร์)
  getAllStudentsProgress: async () => {
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .select('*, students(name), lessons(title)') // Join กับ students และ lessons
      if (error) console.error('Supabase Get All Students Progress Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Get All Students Progress error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการดึงความคืบหน้าของนักเรียนทั้งหมด' } }
    }
  },

  // อัพเดทความคืบหน้า
  updateProgress: async (studentId: number, lessonId: number, progress: any) => {
    try {
      const { data, error } = await supabase
        .from('student_progress')
        .upsert({
          student_id: studentId,
          lesson_id: lessonId,
          ...progress
        }, { onConflict: 'student_id,lesson_id' }) // ระบุคีย์สำหรับ upsert
        .select()
        .single()
      if (error) console.error('Supabase Update Progress Error:', error.message)
      return { data, error }
    } catch (error: any) {
      console.error('Unexpected Update Progress error:', error.message)
      return { data: null, error: { message: 'เกิดข้อผิดพลาดในการอัพเดทความคืบหน้า' } }
    }
  }
}
