import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Student Learning Platform',
  description: 'แพลตฟอร์มการเรียนสำหรับนักเรียน',
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
