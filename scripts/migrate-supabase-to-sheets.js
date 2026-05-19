/**
 * One-time migration: Supabase → Google Sheets
 * รัน: node scripts/migrate-supabase-to-sheets.js
 */

require('dotenv').config({ path: '.env.local' })
const { google } = require('googleapis')

const SUPABASE_URL = 'https://jmkgkjynrbyrodjijeuu.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta2dranlucmJ5cm9kamlqZXV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODYwNjk3NiwiZXhwIjoyMDk0MTgyOTc2fQ.cbbkitx2dGRFcCOHIKvCD4ho_7Y2HVQ1WpCbMGUwsmE'
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID

const HEADERS = {
  tasks:        ['id','user_id','category_id','title','note','priority','status','deadline','start_time','end_time','recurring','total_time_seconds','timer_started_at','google_event_id','completed_at','created_at','updated_at'],
  categories:   ['id','user_id','name','color','bg_color','is_preset','sort_order','created_at'],
  subtasks:     ['id','task_id','title','done','sort_order','created_at'],
  activity_log: ['id','user_id','task_id','action','task_title','created_at'],
}

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2
}

async function fetchSupabase(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=10000`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
  })
  if (!res.ok) throw new Error(`Supabase error ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

function toRow(headers, record) {
  return headers.map(h => {
    const val = record[h]
    if (val === null || val === undefined) return ''
    if (typeof val === 'boolean') return val.toString()
    return String(val)
  })
}

async function migrateTable(sheets, tableName, rows) {
  if (!rows.length) {
    console.log(`  ข้าม ${tableName} — ไม่มีข้อมูล`)
    return
  }

  const headers = HEADERS[tableName]
  const values = rows.map(r => toRow(headers, { ...r, user_id: 'user' }))

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${tableName}!A2`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  })

  console.log(`  ✅ ${tableName}: ${rows.length} rows`)
}

async function main() {
  console.log('\n🔄 เริ่ม Migration จาก Supabase → Google Sheets\n')

  const sheets = google.sheets({ version: 'v4', auth: getAuth() })

  for (const table of Object.keys(HEADERS)) {
    process.stdout.write(`📥 อ่าน ${table} จาก Supabase... `)
    const rows = await fetchSupabase(table)
    console.log(`${rows.length} rows`)
    await migrateTable(sheets, table, rows)
  }

  console.log('\n✅ Migration เสร็จแล้ว! เปิด Google Sheets ดูข้อมูลได้เลย\n')
}

main().catch(err => {
  console.error('\n❌ Error:', err.message)
  process.exit(1)
})
