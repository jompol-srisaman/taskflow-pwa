/**
 * รันครั้งเดียวเพื่อ get GOOGLE_REFRESH_TOKEN
 *
 * วิธีรัน:
 *   node scripts/get-token.js
 *
 * ก่อนรัน ต้องเพิ่ม Redirect URI ใน Google Cloud Console:
 *   http://localhost:9999/callback
 */

const { google } = require('googleapis')
const http = require('http')
const url = require('url')

require('dotenv').config({ path: '.env.local' })

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ กรุณาใส่ GOOGLE_CLIENT_ID และ GOOGLE_CLIENT_SECRET ใน .env.local ก่อน')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:9999/callback'

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
  ],
})

console.log('\n📋 เปิด URL นี้ในเบราว์เซอร์:\n')
console.log(authUrl)
console.log('\n⏳ รอรับ callback...\n')

const server = http.createServer(async (req, res) => {
  const { query } = url.parse(req.url, true)
  if (!query.code) return

  try {
    const { tokens } = await oauth2Client.getToken(query.code)
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h2 style="font-family:sans-serif">✅ สำเร็จ! ปิดหน้าต่างนี้แล้วดูที่ Terminal</h2>')
    server.close()

    console.log('\n✅ ได้ Refresh Token แล้ว!\n')
    console.log('คัดลอกบรรทัดนี้ไปใส่ใน .env.local:\n')
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`)
  } catch (err) {
    res.end('❌ Error: ' + err.message)
    console.error('Error:', err.message)
  }
})

server.listen(9999)
