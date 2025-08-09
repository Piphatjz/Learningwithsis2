"use client"

import { useState, useEffect } from "react" // ลบ useRef
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button" // ลบ Button
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Play, CheckCircle, Clock, User, BarChart3, Home, Video, Loader2 } from "lucide-react"
import { db } from "@/lib/supabase"
import { YouTubePlayer } from "@/components/youtube-player"

// Types
interface Lesson {
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

interface Student {
  id: number
  name: string
  progress: number
  lessons_completed: number
  total_lessons: number
}

interface StudentProgress {
  id?: number // Optional for new records
  student_id: number
  lesson_id: number
  watch_time: number
  total_duration: number
  completed: boolean
  last_watched: string
}

function StudentSidebar() {
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <User className="h-6 w-6" />
          <span className="font-semibold">Student Portal</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>เมนู</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Home className="h-4 w-4" />
                  <span>หน้าหลัก</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Video className="h-4 w-4" />
                  <span>บทเรียน</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <BarChart3 className="h-4 w-4" />
                  <span>ความคืบหน้า</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default function StudentLearningPlatform() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(false) // โหลดเมื่อเลือกนักเรียน
  const [currentWatchTime, setCurrentWatchTime] = useState(0)
  const [currentVideoDuration, setCurrentVideoDuration] = useState(0)

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingLessons(true)
      setLoadingStudents(true)

      const { data: fetchedLessons, error: lessonsError } = await db.getAllLessons()
      if (lessonsError) {
        console.error("Error fetching lessons:", lessonsError)
      } else {
        setLessons(fetchedLessons || [])
      }

      const { data: fetchedStudents, error: studentsError } = await db.getAllStudents()
      if (studentsError) {
        console.error("Error fetching students:", studentsError)
      } else {
        setStudents(fetchedStudents || [])
        if (fetchedStudents && fetchedStudents.length > 0) {
          setSelectedStudentId(fetchedStudents[0].id) // เลือกนักเรียนคนแรกเป็นค่าเริ่มต้น
        }
      }
      setLoadingLessons(false)
      setLoadingStudents(false)
    }
    fetchInitialData()
  }, [])

  useEffect(() => {
    const fetchStudentProgress = async () => {
      if (selectedStudentId !== null) {
        setLoadingProgress(true)
        const { data, error } = await db.getStudentProgress(selectedStudentId)
        if (error) {
          console.error("Error fetching student progress:", error)
        } else {
          setStudentProgress(data || [])
        }
        setLoadingProgress(false)
      } else {
        setStudentProgress([])
      }
    }
    fetchStudentProgress()
  }, [selectedStudentId])

  // อัพเดทความคืบหน้าการดูวิดีโอ
  const handleTimeUpdate = async (currentTime: number, duration: number) => {
    if (selectedStudentId === null || !currentLesson || duration === 0) return

    const maxAllowedJumpSeconds = 10 // อนุญาตให้ข้ามได้ไม่เกิน 10 วินาทีจากเวลาที่บันทึกไว้ล่าสุด

    const existingProgress = studentProgress.find((p) => p.lesson_id === currentLesson.id)
    const lastSavedWatchTime = existingProgress?.watch_time || 0 // เวลาที่บันทึกไว้ล่าสุดใน DB

    const roundedCurrentTime = Math.round(currentTime)
    setCurrentVideoDuration(duration) // อัปเดต duration สำหรับ UI

    // อัปเดต UI state ด้วยเวลาจริงที่ผู้เล่นรายงาน (สำหรับแถบความคืบหน้าใต้เครื่องเล่น)
    setCurrentWatchTime(roundedCurrentTime)

    // --- Logic สำหรับกำหนด watch_time ที่จะส่งไป DB (Anti-cheat สำหรับความคืบหน้า) ---
    let watchTimeForDb = lastSavedWatchTime // เริ่มต้นด้วยเวลาที่บันทึกไว้ล่าสุด

    // หากเวลาปัจจุบันที่ผู้เล่นรายงานสูงกว่าเวลาที่บันทึกไว้ล่าสุด
    if (roundedCurrentTime > lastSavedWatchTime) {
      // คำนวณเวลาสูงสุดที่อนุญาตให้บันทึกได้ในการอัปเดตครั้งนี้
      const allowedAdvanceTime = lastSavedWatchTime + maxAllowedJumpSeconds
      // บันทึกเวลาที่ดูจริง แต่ไม่เกินเวลาที่อนุญาตให้ข้าม
      watchTimeForDb = Math.min(roundedCurrentTime, allowedAdvanceTime)
    }
    // ถ้า roundedCurrentTime <= lastSavedWatchTime (เช่น ผู้ใช้ย้อนกลับหรือดูซ้ำ)
    // watchTimeForDb จะยังคงเป็น lastSavedWatchTime (ไม่ลดลง)
    // ซึ่งหมายความว่าความคืบหน้าใน DB จะไม่ลดลง แต่ UI จะแสดงเวลาจริง

    // ตรวจสอบให้แน่ใจว่า watchTimeForDb ไม่เกินระยะเวลาทั้งหมดของวิดีโอ
    watchTimeForDb = Math.min(watchTimeForDb, Math.round(duration))

    // --- Logic สำหรับกำหนดสถานะการเรียนจบ (Completed Status) ---
    // บทเรียนจะถือว่า completed หาก watchTimeForDb (เวลาที่ดูอย่างถูกต้อง) ถึง 90%
    // และหากเคย completed แล้ว ให้คงสถานะ completed ไว้
    let isCompleted = existingProgress?.completed || false
    if (!isCompleted && (watchTimeForDb / duration) * 100 >= 90) {
      isCompleted = true
    }

    const progressData: Omit<StudentProgress, "id" | "student_id" | "lesson_id"> = {
      watch_time: watchTimeForDb,
      total_duration: Math.round(duration),
      completed: isCompleted,
      last_watched: new Date().toISOString(),
    }

    // อัพเดท DB ก็ต่อเมื่อมีการเปลี่ยนแปลงที่สำคัญ หรือสถานะการเรียนจบเปลี่ยนไป
    const shouldUpdateDb =
      !existingProgress ||
      Math.abs(existingProgress.watch_time - watchTimeForDb) >= 5 || // อัพเดททุก 5 วินาทีของเวลาที่ดู
      existingProgress.completed !== isCompleted // อัพเดทหากสถานะการเรียนจบเปลี่ยนไป

    if (shouldUpdateDb) {
      const { data, error } = await db.updateProgress(selectedStudentId, currentLesson.id, progressData)
      if (error) {
        console.error("Error updating progress:", error)
      } else if (data) {
        // อัพเดท state ของ studentProgress ด้วยข้อมูลที่ได้จาก DB
        setStudentProgress((prev) => {
          const existingIndex = prev.findIndex((p) => p.lesson_id === data.lesson_id)
          if (existingIndex >= 0) {
            const updated = [...prev]
            updated[existingIndex] = data
            return updated
          }
          return [...prev, data]
        })
      }
    }
  }

  // เลือกบทเรียน
  const selectLesson = (lesson: Lesson) => {
    setCurrentLesson(lesson)
    // ค้นหาความคืบหน้าเดิมเพื่อตั้งค่า watchTime เริ่มต้น
    const existingProgress = studentProgress.find((p) => p.lesson_id === lesson.id)
    setCurrentWatchTime(existingProgress?.watch_time || 0)
    setCurrentVideoDuration(existingProgress?.total_duration || 0)
  }

  // คำนวณความคืบหน้ารวมของนักเรียนที่เลือก
  const calculateOverallProgress = () => {
    if (lessons.length === 0 || studentProgress.length === 0) return { totalProgress: 0, completedLessons: 0 }

    const completedCount = studentProgress.filter((p) => p.completed).length
    const totalProgress = (completedCount / lessons.length) * 100

    return {
      totalProgress: Math.round(totalProgress),
      completedLessons: completedCount,
    }
  }

  // ได้รับความคืบหน้าของบทเรียนเฉพาะ
  const getLessonProgress = (lessonId: number) => {
    const progress = studentProgress.find((p) => p.lesson_id === lessonId)
    if (!progress) return { percentage: 0, completed: false, watchTime: 0, totalDuration: 0, lastWatched: "" }

    // Ensure totalDuration is not zero to avoid division by zero
    const percentage = progress.total_duration > 0 ? (progress.watch_time / progress.total_duration) * 100 : 0
    return {
      percentage: Math.round(percentage),
      completed: progress.completed,
      watchTime: progress.watch_time,
      totalDuration: progress.total_duration,
      lastWatched: progress.last_watched,
    }
  }

  const overallProgress = calculateOverallProgress()
  const selectedStudent = students.find((s) => s.id === selectedStudentId)

  if (loadingLessons || loadingStudents) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <StudentSidebar />
      <main className="flex-1">
        <div className="flex items-center gap-4 border-b px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">แพลตฟอร์มการเรียน</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">เลือกนักเรียน:</span>
            <Select
              value={selectedStudentId?.toString() || ""}
              onValueChange={(value) => setSelectedStudentId(Number.parseInt(value))}
              disabled={loadingStudents}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="เลือกนักเรียน" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id.toString()}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Student Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">สวัสดี {selectedStudent?.name || "นักเรียน"}!</CardTitle>
                  <CardDescription>ติดตามความคืบหน้าการเรียนของคุณ</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{overallProgress.totalProgress}%</div>
                  <div className="text-sm text-muted-foreground">ความคืบหน้ารวม</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    บทเรียนที่เรียนจบ: {overallProgress.completedLessons}/{lessons.length}
                  </span>
                  <span>{overallProgress.totalProgress}% เสร็จสิ้น</span>
                </div>
                <Progress value={overallProgress.totalProgress} className="h-3" />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="lessons" className="space-y-4">
            <TabsList>
              <TabsTrigger value="lessons">บทเรียน</TabsTrigger>
              <TabsTrigger value="progress">ความคืบหน้า</TabsTrigger>
            </TabsList>

            <TabsContent value="lessons" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* รายการบทเรียน */}
                <div className="lg:col-span-1 space-y-4">
                  <h2 className="text-xl font-semibold">รายการบทเรียน</h2>
                  {loadingLessons ? (
                    <div className="flex justify-center items-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="ml-2 text-muted-foreground">กำลังโหลดบทเรียน...</p>
                    </div>
                  ) : lessons.length === 0 ? (
                    <div className="text-center py-10">
                      <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">ยังไม่มีบทเรียนให้เรียน</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {lessons.map((lesson) => {
                        const progress = getLessonProgress(lesson.id)
                        return (
                          <Card
                            key={lesson.id}
                            className={`cursor-pointer transition-colors hover:bg-accent ${
                              currentLesson?.id === lesson.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => selectLesson(lesson)}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex items-start justify-between">
                                <CardTitle className="text-sm line-clamp-2">{lesson.title}</CardTitle>
                                {progress.completed && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {lesson.category}
                                </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span>ความคืบหน้า</span>
                                  <span>{progress.percentage}%</span>
                                </div>
                                <Progress value={progress.percentage} className="h-1" />
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Video Player */}
                <div className="lg:col-span-2 space-y-4">
                  {currentLesson ? (
                    <Card>
                      <CardHeader>
                        <CardTitle>{currentLesson.title}</CardTitle>
                        <CardDescription>{currentLesson.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="w-full aspect-video bg-muted rounded-lg">
                            <YouTubePlayer videoId={currentLesson.video_id} onTimeUpdate={handleTimeUpdate} />
                          </div>

                          {/* ความคืบหน้าปัจจุบัน */}
                          {currentVideoDuration > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>ความคืบหน้าการดู</span>
                                <span>{Math.round((currentWatchTime / currentVideoDuration) * 100)}%</span>
                              </div>
                              <Progress
                                value={Math.round((currentWatchTime / currentVideoDuration) * 100)}
                                className="h-2"
                              />
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                  {Math.floor(currentWatchTime / 60)}:
                                  {Math.floor(currentWatchTime % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                                <span>
                                  {Math.floor(currentVideoDuration % 60)
                                    .toString()
                                    .padStart(2, "0")}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">เลือกบทเรียนเพื่อเริ่มเรียน</h3>
                          <p className="text-muted-foreground">คลิกที่บทเรียนในรายการด้านซ้ายเพื่อเริ่มดูวิดีโอ</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="progress" className="space-y-4">
              <h2 className="text-xl font-semibold">รายงานความคืบหน้า</h2>
              {loadingProgress || loadingLessons ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">กำลังโหลดความคืบหน้า...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-10">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ยังไม่มีบทเรียนให้ติดตามความคืบหน้า</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {lessons.map((lesson) => {
                    const progress = getLessonProgress(lesson.id)

                    return (
                      <Card key={lesson.id}>
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{lesson.title}</CardTitle>
                              <CardDescription>{lesson.category}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              {progress.completed && (
                                <Badge variant="default" className="bg-green-500">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  เรียนจบ
                                </Badge>
                              )}
                              <Badge variant="outline">{progress.percentage}%</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <Progress value={progress.percentage} className="h-2" />
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>
                                {progress.watchTime > 0
                                  ? `ดูไปแล้ว ${Math.floor(progress.watchTime / 60)} นาที`
                                  : "ยังไม่เริ่มเรียน"}
                              </span>
                              {progress.watchTime > 0 && (
                                <span>ดูล่าสุด: {new Date(progress.lastWatched).toLocaleDateString("th-TH")}</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarProvider>
  )
}
