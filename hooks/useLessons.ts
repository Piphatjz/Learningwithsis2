import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

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

export function useLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  // โหลดข้อมูลจาก Supabase
  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  // เพิ่มบทเรียนใหม่
  const addLesson = async (lessonData: Omit<Lesson, 'id' | 'views' | 'completion_rate'>) => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .insert([{
          title: lessonData.title,
          youtube_url: lessonData.youtube_url,
          video_id: lessonData.video_id,
          description: lessonData.description,
          category: lessonData.category,
          duration: lessonData.duration
        }])
        .select()

      if (error) throw error
      if (data) {
        setLessons(prev => [data[0], ...prev])
      }
      return { success: true }
    } catch (error) {
      console.error('Error adding lesson:', error)
      return { success: false, error }
    }
  }

  useEffect(() => {
    fetchLessons()
  }, [])

  return { lessons, loading, addLesson, refetch: fetchLessons }
}
