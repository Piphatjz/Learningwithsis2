"use client"

import { useState, useEffect } from "react"
import Image from "next/image" // Import Image component
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import AppSidebar from "@/components/app-sidebar"
import { BookOpen, Users, Video, BarChart3, Plus, Play, Clock, Eye, Loader2 } from "lucide-react" // ลบ GraduationCap, Settings, Home
import db from "@/db" // Declare the db variable

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

// StudentProgressRecord ไม่ได้ถูกใช้โดยตรงในไฟล์นี้แล้ว
// interface StudentProgressRecord {
//   id: number
//   student_id: number
//   lesson_id: number
//   watch_time: number
//   total_duration: number
//   completed: boolean
//   last_watched: string
//   students: { name: string }
//   lessons: { title: string }
// }

export default function TutorDashboard() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [studentsData, setStudentsData] = useState<Student[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newLesson, setNewLesson] = useState({
    title: "",
    youtubeUrl: "",
    description: "",
    category: "",
  })
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [addingLesson, setAddingLesson] = useState(false)

  // เพิ่ม state สำหรับเก็บค่าสถิติที่คำนวณจาก student_progress
  const [dashboardTotalViews, setDashboardTotalViews] = useState(0)
  const [dashboardAvgCompletionRate, setDashboardAvgCompletionRate] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoadingLessons(true)
      setLoadingStudents(true)

      const { data: fetchedLessons, error: lessonsError } = await db.getAllLessons()
      if (lessonsError) {
        console.error("Error fetching lessons:", lessonsError)
      } else {
        setLessons(fetchedLessons || [])
      }

      const { data: studentProfiles, error: profileError } = await db.getAllStudents()
      const { data: allProgressRecords, error: progressError } = await db.getAllStudentsProgress()

      if (profileError) {
        console.error("Error fetching student profiles:", profileError)
      }
      if (progressError) {
        console.error("Error fetching all progress records:", progressError)
      }

      if (studentProfiles && allProgressRecords && fetchedLessons) {
        const totalAvailableLessons = fetchedLessons.length

        const processedStudents: Student[] = studentProfiles.map((profile) => {
          const studentLessonsProgress = allProgressRecords.filter((record) => record.student_id === profile.id)

          const completedLessons = studentLessonsProgress.filter((record) => record.completed).length

          let overallProgress = 0
          if (totalAvailableLessons > 0) {
            overallProgress = (completedLessons / totalAvailableLessons) * 100
          }

          return {
            id: profile.id,
            name: profile.name,
            progress: Math.round(overallProgress),
            lessons_completed: completedLessons,
            total_lessons: totalAvailableLessons,
          }
        })
        setStudentsData(processedStudents)

        // คำนวณ "การดูทั้งหมด" จาก student_progress
        const actualTotalViews = allProgressRecords.filter((record) => record.watch_time > 0).length
        setDashboardTotalViews(actualTotalViews)

        // คำนวณ "อัตราการเรียนจบเฉลี่ย" จาก student_progress
        const lessonsWithProgress = new Set(allProgressRecords.map((record) => record.lesson_id))
        let totalCompletionPercentage = 0
        let lessonsCountedForCompletion = 0

        lessonsWithProgress.forEach((lessonId) => {
          const recordsForLesson = allProgressRecords.filter((record) => record.lesson_id === lessonId)
          if (recordsForLesson.length > 0) {
            // หาค่าเฉลี่ย watch_time / total_duration สำหรับบทเรียนนั้นๆ
            const sumWatchTime = recordsForLesson.reduce((sum, record) => sum + record.watch_time, 0)
            const sumTotalDuration = recordsForLesson.reduce((sum, record) => sum + record.total_duration, 0)

            if (sumTotalDuration > 0) {
              totalCompletionPercentage += (sumWatchTime / sumTotalDuration) * 100
              lessonsCountedForCompletion++
            }
          }
        })

        const actualAvgCompletionRate =
          lessonsCountedForCompletion > 0 ? totalCompletionPercentage / lessonsCountedForCompletion : 0
        setDashboardAvgCompletionRate(actualAvgCompletionRate)
      }
      setLoadingLessons(false)
      setLoadingStudents(false)
    }

    fetchData()
  }, [])

  const extractVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?#]+)/
    const match = url.match(regex)
    return match ? match[1] : ""
  }

  // ฟังก์ชันเพิ่มบทเรียนใหม่
  const handleAddLesson = async () => {
    if (!newLesson.title || !newLesson.youtubeUrl) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน")
      return
    }

    setAddingLesson(true)
    const videoId = extractVideoId(newLesson.youtubeUrl)
    const lessonData = {
      title: newLesson.title,
      youtube_url: newLesson.youtubeUrl,
      video_id: videoId,
      description: newLesson.description,
      category: newLesson.category,
      duration: "ไม่ระบุ", // สามารถดึงจาก YouTube API ได้ในอนาคต
      views: 0,
      completion_rate: 0,
    }

    const { data, error } = await db.addLesson(lessonData)
    setAddingLesson(false)

    if (error) {
      console.error("Error adding lesson:", error)
      alert("เกิดข้อผิดพลาดในการเพิ่มบทเรียน")
    } else if (data) {
      setLessons((prevLessons) => [data, ...prevLessons])
      setNewLesson({ title: "", youtubeUrl: "", description: "", category: "" })
      setIsAddDialogOpen(false)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1">
        <div className="flex items-center gap-4 border-b px-6 py-4">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Dashboard ติวเตอร์</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">เนื้อหาทั้งหมด</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingLessons ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <div className="text-2xl font-bold">{lessons.length}</div>
                )}
                <p className="text-xs text-muted-foreground">บทเรียน</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">นักเรียนทั้งหมด</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <div className="text-2xl font-bold">{studentsData.length}</div>
                )}
                <p className="text-xs text-muted-foreground">คน</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">การดูทั้งหมด</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingLessons || loadingStudents ? ( // ใช้ loading ทั้งคู่เพราะดึงจาก progress
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <div className="text-2xl font-bold">{dashboardTotalViews.toLocaleString()}</div>
                )}
                <p className="text-xs text-muted-foreground">ครั้ง</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">อัตราการเรียนจบ</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingLessons || loadingStudents ? ( // ใช้ loading ทั้งคู่เพราะดึงจาก progress
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <div className="text-2xl font-bold">{dashboardAvgCompletionRate.toFixed(1)}%</div>
                )}
                <p className="text-xs text-muted-foreground">เฉลี่ย</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="lessons" className="space-y-4">
            <TabsList>
              <TabsTrigger value="lessons">เนื้อหาการสอน</TabsTrigger>
              <TabsTrigger value="students">นักเรียน</TabsTrigger>
            </TabsList>

            <TabsContent value="lessons" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">เนื้อหาการสอน</h2>
                <div className="flex gap-2">
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        เพิ่มเนื้อหาใหม่
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>เพิ่มเนื้อหาการสอนจาก YouTube</DialogTitle>
                        <DialogDescription>กรอกข้อมูลเนื้อหาการสอนใหม่ที่ต้องการเพิ่ม</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">ชื่อบทเรียน</Label>
                          <Input
                            id="title"
                            value={newLesson.title}
                            onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                            placeholder="เช่น พื้นฐานคณิตศาสตร์ ม.1"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="youtube-url">YouTube URL</Label>
                          <Input
                            id="youtube-url"
                            value={newLesson.youtubeUrl}
                            onChange={(e) => setNewLesson({ ...newLesson, youtubeUrl: e.target.value })}
                            placeholder="https://www.youtube.com/watch?v=..."
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="category">หมวดหมู่</Label>
                          <Select onValueChange={(value) => setNewLesson({ ...newLesson, category: value })}>
                            <SelectTrigger>
                              <SelectValue placeholder="เลือกหมวดหมู่" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="คณิตศาสตร์">คณิตศาสตร์</SelectItem>
                              <SelectItem value="ฟิสิกส์">ฟิสิกส์</SelectItem>
                              <SelectItem value="เคมี">เคมี</SelectItem>
                              <SelectItem value="ชีววิทยา">ชีววิทยา</SelectItem>
                              <SelectItem value="ภาษาอังกฤษ">ภาษาอังกฤษ</SelectItem>
                              <SelectItem value="ภาษาไทย">ภาษาไทย</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">คำอธิบาย</Label>
                          <Textarea
                            id="description"
                            value={newLesson.description}
                            onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
                            placeholder="อธิบายเนื้อหาของบทเรียน..."
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={handleAddLesson} disabled={addingLesson}>
                          {addingLesson && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          เพิ่มเนื้อหา
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {loadingLessons ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">กำลังโหลดบทเรียน...</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-10">
                  <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ยังไม่มีบทเรียน เพิ่มบทเรียนแรกของคุณเลย!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lessons.map((lesson) => (
                    <Card key={lesson.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted relative">
                        <Image // ใช้ Image component
                          src={`https://img.youtube.com/vi/${lesson.video_id}/maxresdefault.jpg`}
                          alt={lesson.title}
                          fill // ใช้ fill เพื่อให้รูปภาพปรับขนาดตาม parent
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" // เพิ่ม sizes prop
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Play className="h-12 w-12 text-white" />
                        </div>
                      </div>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg line-clamp-2">{lesson.title}</CardTitle>
                          <Badge variant="secondary">{lesson.category}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2">{lesson.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {lesson.duration}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4" />
                              {lesson.views} ครั้ง
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>อัตราการเรียนจบ</span>
                              <span>{lesson.completion_rate}%</span>
                            </div>
                            <Progress value={lesson.completion_rate} className="h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="students" className="space-y-4">
              <h2 className="text-xl font-semibold">ความคืบหน้าของนักเรียน</h2>
              {loadingStudents ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2 text-muted-foreground">กำลังโหลดข้อมูลนักเรียน...</p>
                </div>
              ) : studentsData.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">ยังไม่มีนักเรียนในระบบ</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {studentsData.map((student) => (
                    <Card key={student.id}>
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">{student.name}</CardTitle>
                          <Badge
                            variant={
                              student.progress >= 80 ? "default" : student.progress >= 60 ? "secondary" : "destructive"
                            }
                          >
                            {student.progress}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>
                              บทเรียนที่เรียนจบ: {student.lessons_completed}/{student.total_lessons}
                            </span>
                            <span>{student.progress}% เสร็จสิ้น</span>
                          </div>
                          <Progress value={student.progress} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarProvider>
  )
}
