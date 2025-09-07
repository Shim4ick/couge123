// app/api/cleanup-cron/route.ts
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const response = await fetch('https://mwnsfvxzxfebddyzbyez.supabase.co/functions/v1/cleanup_presence', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
  })

  const json = await response.json()

  return new Response(JSON.stringify({ triggered: true, result: json }), {
    status: response.status,
  })
}
