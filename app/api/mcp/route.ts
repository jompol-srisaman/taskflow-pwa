import { NextRequest, NextResponse } from 'next/server'
import { mcpListTasks, mcpAddTask } from '@/app/actions/mcp'
import type { ImportanceLevel } from '@/types'

export async function GET() {
  try {
    const tasks = await mcpListTasks()
    return NextResponse.json({ success: true, tasks })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, urgent, important } = body
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }
    const importanceLevel: ImportanceLevel = ['high','medium','low'].includes(important) ? important : 'medium'
    const result = await mcpAddTask(title, !!urgent, importanceLevel)
    return NextResponse.json({ success: true, task: result })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
