import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// import { AuthGuard } from '@/components/auth-guard' // ลบ AuthGuard ออก

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ระบบการเรียนออนไลน์',
  description: 'แพลตฟอร์มการเรียนออนไลน์สำหรับติวเตอร์และนักเรียน',
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th">
      <body className={inter.className}>
        {/* <AuthGuard> */}
          {children}
        {/* </AuthGuard> */}
      </body>
    </html>
  )
}
