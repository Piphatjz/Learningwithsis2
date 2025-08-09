import { createBrowserClient, type PostgrestError } from "@supabase/ssr"

// Define types here or import from a shared types file
export interface Lesson {
  id: number
  title: string
  youtube_url: string
  video_id: string
  description: string
  category: string
  duration: string
  views: number
  completion_rate: number
}

export interface Student {
  id: number
  name: string
  progress: number
  lessons_completed: number
  total_lessons: number
}

export interface StudentProgress {
  id?: number
  student_id: number
  lesson_id: number
  watch_time: number
  total_duration: number
  completed: boolean
  last_watched: string
}

// For getAllStudentsProgress join result
export interface StudentProgressRecord extends StudentProgress {
  students: { name: string } | null
  lessons: { title: string } | null
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database helpers
export const db = {
  // ดึงบทเรียนทั้งหมด
  getAllLessons: async (): Promise<{ data: Lesson[] | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase.from("lessons").select("*").order("created_at", { ascending: false })
      if (error) console.error("Supabase Get All Lessons Error:", error.message)
      return { data: data as Lesson[] | null, error }
    } catch (error: unknown) {
      // ใช้ unknown แทน any
      console.error("Unexpected Get All Lessons error:", (error as Error).message)
      return {
        data: null,
        error: { message: "เกิดข้อผิดพลาดในการดึงบทเรียน", code: "UNKNOWN", details: null, hint: null } as PostgrestError,
      }
    }
  },

  // เพิ่มบทเรียนใหม่
  addLesson: async (
    lesson: Omit<Lesson, "id" | "views" | "completion_rate">,
  ): Promise<{ data: Lesson | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase.from("lessons").insert([lesson]).select().single()
      if (error) console.error("Supabase Add Lesson Error:", error.message)
      return { data: data as Lesson | null, error }
    } catch (error: unknown) {
      console.error("Unexpected Add Lesson error:", (error as Error).message)
      return {
        data: null,
        error: { message: "เกิดข้อผิดพลาดในการเพิ่มบทเรียน", code: "UNKNOWN", details: null, hint: null } as PostgrestError,
      }
    }
  },

  // ดึงข้อมูลนักเรียนทั้งหมดจากตาราง students
  getAllStudents: async (): Promise<{ data: Student[] | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase.from("students").select("*")
      if (error) console.error("Supabase Get All Students Error:", error.message)
      return { data: data as Student[] | null, error }
    } catch (error: unknown) {
      console.error("Unexpected Get All Students error:", (error as Error).message)
      return {
        data: null,
        error: {
          message: "เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน",
          code: "UNKNOWN",
          details: null,
          hint: null,
        } as PostgrestError,
      }
    }
  },

  // ดึงความคืบหน้าของนักเรียนคนใดคนหนึ่ง
  getStudentProgress: async (
    studentId: number,
  ): Promise<{ data: StudentProgress[] | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase.from("student_progress").select("*").eq("student_id", studentId)
      if (error) console.error("Supabase Get Student Progress Error:", error.message)
      return { data: data as StudentProgress[] | null, error }
    } catch (error: unknown) {
      console.error("Unexpected Get Student Progress error:", (error as Error).message)
      return {
        data: null,
        error: {
          message: "เกิดข้อผิดพลาดในการดึงความคืบหน้าของนักเรียน",
          code: "UNKNOWN",
          details: null,
          hint: null,
        } as PostgrestError,
      }
    }
  },

  // ดึงความคืบหน้าของนักเรียนทั้งหมด (สำหรับติวเตอร์)
  getAllStudentsProgress: async (): Promise<{ data: StudentProgressRecord[] | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase.from("student_progress").select("*, students(name), lessons(title)") // Join กับ students และ lessons
      if (error) console.error("Supabase Get All Students Progress Error:", error.message)
      return { data: data as StudentProgressRecord[] | null, error }
    } catch (error: unknown) {
      console.error("Unexpected Get All Students Progress error:", (error as Error).message)
      return {
        data: null,
        error: {
          message: "เกิดข้อผิดพลาดในการดึงความคืบหน้าของนักเรียนทั้งหมด",
          code: "UNKNOWN",
          details: null,
          hint: null,
        } as PostgrestError,
      }
    }
  },

  // อัพเดทความคืบหน้า
  updateProgress: async (
    studentId: number,
    lessonId: number,
    progress: Omit<StudentProgress, "id" | "student_id" | "lesson_id">,
  ): Promise<{ data: StudentProgress | null; error: PostgrestError | null }> => {
    try {
      const { data, error } = await supabase
        .from("student_progress")
        .upsert(
          {
            student_id: studentId,
            lesson_id: lessonId,
            ...progress,
          },
          { onConflict: "student_id,lesson_id" },
        ) // ระบุคีย์สำหรับ upsert
        .select()
        .single()
      if (error) console.error("Supabase Update Progress Error:", error.message)
      return { data: data as StudentProgress | null, error }
    } catch (error: unknown) {
      console.error("Unexpected Update Progress error:", (error as Error).message)
      return {
        data: null,
        error: {
          message: "เกิดข้อผิดพลาดในการอัพเดทความคืบหน้า",
          code: "UNKNOWN",
          details: null,
          hint: null,
        } as PostgrestError,
      }
    }
  },
}
