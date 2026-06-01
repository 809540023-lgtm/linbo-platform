// research/page.tsx 是 'use client'，dynamic 設定要透過 server layout 才會生效
export const dynamic = 'force-dynamic'

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
