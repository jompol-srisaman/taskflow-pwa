import { google } from 'googleapis'

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID!
export const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

let sheetsInitialized = false
const headersCache = new Map<string, string[]>()

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return oauth2
}

export function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export function getCalendarClient() {
  return google.calendar({ version: 'v3', auth: getAuth() })
}

function colLetter(n: number): string {
  if (n < 26) return String.fromCharCode(65 + n)
  return String.fromCharCode(64 + Math.floor(n / 26)) + String.fromCharCode(65 + (n % 26))
}

// Read all rows as objects using header row as keys
export async function sheetReadAll(sheetName: string): Promise<Record<string, string>[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return []
  const [headers, ...dataRows] = rows
  return dataRows
    .filter(r => r?.some(c => c !== undefined && c !== ''))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
}

// Append a new row (column order determined by existing headers)
export async function sheetAppend(sheetName: string, record: Record<string, string>) {
  const sheets = getSheetsClient()
  let headers = headersCache.get(sheetName)
  if (!headers) {
    const headersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!1:1`,
    })
    headers = (headersRes.data.values?.[0] ?? []) as string[]
    headersCache.set(sheetName, headers)
  }
  const row = headers.map(h => record[h] ?? '')
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  })
}

// Update specific fields of a row found by id column
export async function sheetUpdate(sheetName: string, id: string, updates: Record<string, string>) {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return
  const headers = rows[0]
  const idCol = headers.indexOf('id')
  const rowIdx = rows.findIndex((r, i) => i > 0 && r[idCol] === id)
  if (rowIdx < 0) return

  const updatedRow = [...rows[rowIdx]]
  while (updatedRow.length < headers.length) updatedRow.push('')
  for (const [key, val] of Object.entries(updates)) {
    const col = headers.indexOf(key)
    if (col >= 0) updatedRow[col] = val
  }

  const sheetRowNum = rowIdx + 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${sheetRowNum}:${colLetter(headers.length - 1)}${sheetRowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [updatedRow] },
  })
}

// Delete a single row by id
export async function sheetDelete(sheetName: string, id: string) {
  const sheets = getSheetsClient()
  const [sheetId, rowIdx] = await findRowInfo(sheets, sheetName, 'id', id)
  if (rowIdx < 0) return
  await batchDeleteRows(sheets, sheetId, [rowIdx])
}

// Delete all rows where a field equals a value
export async function sheetDeleteWhere(sheetName: string, fieldName: string, value: string) {
  const sheets = getSheetsClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  const sheetId = sheet?.properties?.sheetId ?? 0

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return

  const headers = rows[0]
  const fieldCol = headers.indexOf(fieldName)
  if (fieldCol < 0) return

  const indices: number[] = []
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][fieldCol] ?? '') === value) indices.push(i)
  }
  if (!indices.length) return

  await batchDeleteRows(sheets, sheetId, indices)
}

// Initialize all required sheets and headers if missing
export async function ensureSheets() {
  if (sheetsInitialized) return
  const sheets = getSheetsClient()
  const SHEET_HEADERS: Record<string, string[]> = {
    tasks: ['id','user_id','category_id','project_id','phase_id','title','note','is_urgent','is_important','status','deadline','start_time','end_time','recurring','total_time_seconds','timer_started_at','google_event_id','completed_at','created_at','updated_at'],
    categories: ['id','user_id','name','color','bg_color','is_preset','sort_order','created_at'],
    subtasks: ['id','task_id','title','done','sort_order','created_at'],
    activity_log: ['id','user_id','task_id','action','task_title','created_at'],
    projects: ['id','user_id','name','description','color','status','sort_order','created_at'],
    phases: ['id','project_id','name','color','sort_order','created_at'],
    project_notes: ['id','project_id','note','type','created_at'],
  }

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const existingNames = new Set(meta.data.sheets?.map(s => s.properties?.title) ?? [])
  console.log('Existing sheets in Google Spreadsheet:', Array.from(existingNames))

  const createRequests = Object.keys(SHEET_HEADERS)
    .filter(name => !existingNames.has(name))
    .map(title => ({ addSheet: { properties: { title } } }))

  if (createRequests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: createRequests },
    })
  }

  for (const [name, requiredHeaders] of Object.entries(SHEET_HEADERS)) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${name}!A1:1`,
    })
    if (!res.data.values?.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${name}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [requiredHeaders] },
      })
      headersCache.set(name, requiredHeaders)
    } else {
      const existing = res.data.values[0] as string[]
      const missing = requiredHeaders.filter(h => !existing.includes(h))
      if (missing.length) {
        // Append missing columns to header row
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${name}!${colLetter(existing.length)}1`,
          valueInputOption: 'RAW',
          requestBody: { values: [missing] },
        })
        headersCache.set(name, [...existing, ...missing])
      } else {
        headersCache.set(name, existing)
      }
    }
  }
  sheetsInitialized = true
}

// --- Internal helpers ---

async function findRowInfo(
  sheets: ReturnType<typeof getSheetsClient>,
  sheetName: string,
  field: string,
  value: string,
): Promise<[number, number]> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === sheetName)
  const sheetId = sheet?.properties?.sheetId ?? 0

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:Z`,
  })
  const rows = (res.data.values ?? []) as string[][]
  if (rows.length < 2) return [sheetId, -1]

  const headers = rows[0]
  const col = headers.indexOf(field)
  const rowIdx = rows.findIndex((r, i) => i > 0 && (r[col] ?? '') === value)
  return [sheetId, rowIdx]
}

async function batchDeleteRows(
  sheets: ReturnType<typeof getSheetsClient>,
  sheetId: number,
  rowIndices: number[],
) {
  // Delete bottom-to-top to avoid index shifting
  const requests = [...rowIndices].sort((a, b) => b - a).map(i => ({
    deleteDimension: {
      range: { sheetId, dimension: 'ROWS', startIndex: i, endIndex: i + 1 },
    },
  }))
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests },
  })
}
