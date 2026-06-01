// 強制 dynamic — 因為 login/page.tsx 是 'use client'，無法直接放 dynamic 設定
// 在這層 server layout 設定會把整個 /auth/login 路由標記為 dynamic
// 避免 build 時 prerender 失敗（@supabase/ssr 需要 env 在 build 階段不可用）
export const dynamic = 'force-dynamic'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
