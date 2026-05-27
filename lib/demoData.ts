import type { Task, Category, Project, Phase, Subtask, ActivityLog, ProjectNote } from '@/types'

const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString().split('T')[0]
const daysLater = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split('T')[0]
const ts = (d = 0) => new Date(now.getTime() - d * 86400000).toISOString()

export const DEMO_CATEGORIES: Category[] = [
  { id: 'cat-1', user_id: 'demo', name: 'งานออฟฟิศ',         color: '#2471A3', bg_color: '#EBF5FB', is_preset: false, sort_order: 0, created_at: ts(30) },
  { id: 'cat-2', user_id: 'demo', name: 'โปรเจกต์ส่วนตัว',  color: '#27AE60', bg_color: '#EDF7F1', is_preset: false, sort_order: 1, created_at: ts(30) },
  { id: 'cat-3', user_id: 'demo', name: 'การเงิน & บิล',     color: '#D35400', bg_color: '#FEF5EE', is_preset: false, sort_order: 2, created_at: ts(30) },
]

export const DEMO_PHASES: Phase[] = [
  { id: 'ph-1', project_id: 'proj-1', name: 'Planning',     color: '#6B7280', sort_order: 0, created_at: ts(20) },
  { id: 'ph-2', project_id: 'proj-1', name: 'Development',  color: '#3B82F6', sort_order: 1, created_at: ts(20) },
  { id: 'ph-3', project_id: 'proj-1', name: 'Review',       color: '#F59E0B', sort_order: 2, created_at: ts(20) },
  { id: 'ph-4', project_id: 'proj-1', name: 'Done',         color: '#10B981', sort_order: 3, created_at: ts(20) },
  { id: 'ph-5', project_id: 'proj-2', name: 'Research',     color: '#8B5CF6', sort_order: 0, created_at: ts(15) },
  { id: 'ph-6', project_id: 'proj-2', name: 'Design',       color: '#EC4899', sort_order: 1, created_at: ts(15) },
  { id: 'ph-7', project_id: 'proj-2', name: 'Launch',       color: '#10B981', sort_order: 2, created_at: ts(15) },
]

export const DEMO_PROJECTS: Project[] = [
  {
    id: 'proj-1', user_id: 'demo',
    name: 'Website Revamp',
    description: 'ปรับปรุง website ใหม่ทั้งหมด รองรับ mobile',
    color: '#3B82F6', status: 'active', sort_order: 0, created_at: ts(20),
    phases: DEMO_PHASES.filter(p => p.project_id === 'proj-1'),
  },
  {
    id: 'proj-2', user_id: 'demo',
    name: 'Mobile App Q3',
    description: 'พัฒนา mobile app เสร็จภายใน Q3',
    color: '#10B981', status: 'active', sort_order: 1, created_at: ts(15),
    phases: DEMO_PHASES.filter(p => p.project_id === 'proj-2'),
  },
]

const cat1 = DEMO_CATEGORIES[0]
const cat2 = DEMO_CATEGORIES[1]
const cat3 = DEMO_CATEGORIES[2]
const proj1 = DEMO_PROJECTS[0]
const proj2 = DEMO_PROJECTS[1]
const ph1 = DEMO_PHASES[0]
const ph2 = DEMO_PHASES[1]
const ph3 = DEMO_PHASES[2]
const ph5 = DEMO_PHASES[4]
const ph6 = DEMO_PHASES[5]

export const DEMO_TASKS: Task[] = [
  {
    id: 'task-1', user_id: 'demo',
    category_id: 'cat-1', project_id: 'proj-1', phase_id: 'ph-2',
    title: 'สร้าง component library ใหม่',
    note: 'ใช้ Tailwind + shadcn/ui ให้ consistent ทั้ง project',
    is_urgent: true, is_important: 'high', status: 'todo',
    deadline: daysLater(2), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 3600, timer_started_at: null,
    google_event_id: null, completed_at: null,
    created_at: ts(5), updated_at: ts(1),
    category: cat1, project: proj1, phase: ph2,
    subtasks: [
      { id: 'sub-1-1', task_id: 'task-1', title: 'ออกแบบ design tokens', done: true,  sort_order: 0, created_at: ts(5) },
      { id: 'sub-1-2', task_id: 'task-1', title: 'สร้าง Button variants',  done: false, sort_order: 1, created_at: ts(5) },
      { id: 'sub-1-3', task_id: 'task-1', title: 'สร้าง Form components', done: false, sort_order: 2, created_at: ts(5) },
    ],
  },
  {
    id: 'task-2', user_id: 'demo',
    category_id: 'cat-1', project_id: 'proj-1', phase_id: 'ph-3',
    title: 'ส่งรายงานประจำเดือนให้หัวหน้า',
    note: 'สรุปผลงาน Q2 พร้อม metrics',
    is_urgent: true, is_important: 'high', status: 'todo',
    deadline: daysAgo(2), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 0, timer_started_at: null,
    google_event_id: null, completed_at: null,
    created_at: ts(7), updated_at: ts(2),
    category: cat1, project: proj1, phase: ph3,
    subtasks: [],
  },
  {
    id: 'task-3', user_id: 'demo',
    category_id: 'cat-2', project_id: 'proj-2', phase_id: 'ph-5',
    title: 'วิเคราะห์ competitor apps',
    note: 'ดู UX flow ของ 5 แอปคู่แข่ง แล้วสรุป insight',
    is_urgent: false, is_important: 'high', status: 'todo',
    deadline: daysLater(5), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 1800, timer_started_at: new Date(now.getTime() - 300000).toISOString(),
    google_event_id: null, completed_at: null,
    created_at: ts(3), updated_at: ts(0),
    category: cat2, project: proj2, phase: ph5,
    subtasks: [],
  },
  {
    id: 'task-4', user_id: 'demo',
    category_id: 'cat-3', project_id: null, phase_id: null,
    title: 'จ่ายบิลค่าน้ำค่าไฟ',
    note: '',
    is_urgent: true, is_important: 'medium', status: 'todo',
    deadline: daysLater(1), start_time: null, end_time: null, recurring: 'monthly',
    total_time_seconds: 0, timer_started_at: null,
    google_event_id: null, completed_at: null,
    created_at: ts(2), updated_at: ts(0),
    category: cat3, project: undefined, phase: undefined,
    subtasks: [],
  },
  {
    id: 'task-5', user_id: 'demo',
    category_id: 'cat-1', project_id: 'proj-1', phase_id: 'ph-1',
    title: 'จัดทำ sitemap และ wireframe',
    note: 'ครอบคลุมทุก page รวมถึง mobile view',
    is_urgent: false, is_important: 'medium', status: 'todo',
    deadline: daysLater(7), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 0, timer_started_at: null,
    google_event_id: null, completed_at: null,
    created_at: ts(4), updated_at: ts(1),
    category: cat1, project: proj1, phase: ph1,
    subtasks: [],
  },
  {
    id: 'task-6', user_id: 'demo',
    category_id: 'cat-2', project_id: 'proj-2', phase_id: 'ph-6',
    title: 'ออกแบบ UI/UX สำหรับ onboarding flow',
    note: '',
    is_urgent: false, is_important: 'medium', status: 'todo',
    deadline: daysLater(10), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 0, timer_started_at: null,
    google_event_id: null, completed_at: null,
    created_at: ts(3), updated_at: ts(0),
    category: cat2, project: proj2, phase: ph6,
    subtasks: [],
  },
  {
    id: 'task-7', user_id: 'demo',
    category_id: 'cat-1', project_id: 'proj-1', phase_id: 'ph-2',
    title: 'Setup CI/CD pipeline',
    note: 'GitHub Actions → Vercel auto-deploy',
    is_urgent: false, is_important: 'low', status: 'done',
    deadline: daysAgo(1), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 5400, timer_started_at: null,
    google_event_id: null, completed_at: ts(1),
    created_at: ts(8), updated_at: ts(1),
    category: cat1, project: proj1, phase: ph2,
    subtasks: [],
  },
  {
    id: 'task-8', user_id: 'demo',
    category_id: 'cat-2', project_id: 'proj-2', phase_id: 'ph-5',
    title: 'กำหนด Tech stack สำหรับ mobile app',
    note: 'ตัดสินใจระหว่าง React Native vs Flutter',
    is_urgent: false, is_important: 'high', status: 'done',
    deadline: daysAgo(3), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 2700, timer_started_at: null,
    google_event_id: null, completed_at: ts(2),
    created_at: ts(10), updated_at: ts(2),
    category: cat2, project: proj2, phase: ph5,
    subtasks: [],
  },
  {
    id: 'task-9', user_id: 'demo',
    category_id: 'cat-3', project_id: null, phase_id: null,
    title: 'ต่ออายุ domain ปีหน้า',
    note: 'ต่ออายุ 2 ปี ถูกกว่า',
    is_urgent: false, is_important: 'low', status: 'done',
    deadline: daysAgo(5), start_time: null, end_time: null, recurring: '',
    total_time_seconds: 600, timer_started_at: null,
    google_event_id: null, completed_at: ts(4),
    created_at: ts(14), updated_at: ts(4),
    category: cat3, project: undefined, phase: undefined,
    subtasks: [],
  },
]

export const DEMO_PROJECT_NOTES: ProjectNote[] = [
  { id: 'note-1', project_id: 'proj-1', note: 'ติดปัญหา design token ยังไม่ finalize — รอ feedback จาก designer', type: 'blocker', created_at: ts(3) },
  { id: 'note-2', project_id: 'proj-1', note: 'CI/CD pipeline setup เสร็จแล้ว auto-deploy ใช้งานได้', type: 'resolved', created_at: ts(1) },
  { id: 'note-3', project_id: 'proj-2', note: 'ตัดสินใจใช้ React Native — ทีมมี expertise มากกว่า Flutter', type: 'update', created_at: ts(2) },
]

export const DEMO_ACTIVITY_LOG: ActivityLog[] = [
  { id: 'log-1', user_id: 'demo', task_id: 'task-7', action: 'completed', task_title: 'Setup CI/CD pipeline',         created_at: ts(1) },
  { id: 'log-2', user_id: 'demo', task_id: 'task-8', action: 'completed', task_title: 'กำหนด Tech stack สำหรับ mobile app', created_at: ts(2) },
  { id: 'log-3', user_id: 'demo', task_id: 'task-9', action: 'completed', task_title: 'ต่ออายุ domain ปีหน้า',         created_at: ts(4) },
  { id: 'log-4', user_id: 'demo', task_id: 'task-1', action: 'created',   task_title: 'สร้าง component library ใหม่',  created_at: ts(5) },
]
