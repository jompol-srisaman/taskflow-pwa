# KhunMeenFlow — Progress Log

## [WIP] Project Manager + Test Page
_อัปเดต: 2026-05-27_

### Step 1 — Types & Data Model ✅
- [x] เพิ่ม `Project`, `Phase` types ใน `types/index.ts`
- [x] เพิ่ม `project_id`, `phase_id` ใน `Task` type
- [x] เพิ่ม `projectId` ใน `TaskFilter` type

### Step 2 — Sheets & Actions ✅
- [x] อัปเดต `lib/sheets.ts` — เพิ่ม projects/phases sheets + migration columns อัตโนมัติ
- [x] สร้าง `app/actions/projects.ts` — CRUD projects + phases
- [x] อัปเดต `app/actions/tasks.ts` — รองรับ project_id, phase_id

### Step 3 — Store ✅
- [x] อัปเดต `store/taskStore.ts` — เพิ่ม projects, phases, currentProjectId, upsert/remove actions
- [x] อัปเดต `hooks/useTasks.ts` — โหลด projects + phases พร้อมกัน
- [x] อัปเดต `store/uiStore.ts` — เพิ่ม projectId ใน default filter

### Step 4 — UI: Project Manager ✅
- [x] อัปเดต `Sidebar.tsx` — project switcher dropdown + Projects nav item
- [x] สร้าง `components/projects/ProjectModal.tsx` — create/edit project + phases (กำหนดสีเองได้)
- [x] อัปเดต `components/tasks/TaskModal.tsx` — เพิ่ม project + phase dropdowns
- [x] อัปเดต `app/(app)/dashboard/page.tsx` — filter by currentProjectId
- [x] อัปเดต `app/(app)/tasks/page.tsx` — filter by currentProjectId
- [x] สร้าง `app/(app)/projects/page.tsx` — project list + progress bars + phase breakdown

### Step 5 — Test Page (Demo Mode) ✅
- [x] สร้าง `lib/demoData.ts` — 9 tasks, 3 categories, 2 projects, 7 phases
- [x] สร้าง `store/demoTaskStore.ts` — separate Zustand instance
- [x] สร้าง `hooks/useDemoActions.ts` — in-memory CRUD (ไม่เรียก server)
- [x] สร้าง `components/tasks/DemoTaskCard.tsx`
- [x] สร้าง `components/tasks/DemoTaskModal.tsx`
- [x] สร้าง `components/views/DemoListView.tsx`, `DemoCardView.tsx`, `DemoKanbanView.tsx`
- [x] สร้าง `components/DemoShell.tsx` — demo banner + reset button + demo sidebar
- [x] สร้าง `app/test/layout.tsx` + `app/test/page.tsx`

### รอ Build Check & Confirm ก่อน Push
- [x] TypeScript build pass (`npx tsc --noEmit` — clean)
- [x] Production build pass (`npm run build` — 13/13 routes, `/test` included)
- [ ] ทดสอบ dev server
- [ ] Push to GitHub
- [ ] Deploy to Vercel

## ไฟล์ที่แก้ไข/สร้างใหม่
| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `types/index.ts` | + Project, Phase, ProjectStatus types; Task + project_id, phase_id |
| `lib/sheets.ts` | + projects/phases headers; migration columns อัตโนมัติ |
| `lib/demoData.ts` | ใหม่ — demo seed data |
| `app/actions/projects.ts` | ใหม่ — CRUD projects + phases |
| `app/actions/tasks.ts` | + project_id, phase_id ใน fetch/create/update |
| `store/taskStore.ts` | + projects, phases, currentProjectId state |
| `store/demoTaskStore.ts` | ใหม่ — separate demo store |
| `store/uiStore.ts` | + projectId ใน defaultFilter |
| `hooks/useTasks.ts` | + โหลด projects + phases |
| `hooks/useDemoActions.ts` | ใหม่ — in-memory actions |
| `components/layout/Sidebar.tsx` | + project switcher + Projects nav |
| `components/projects/ProjectModal.tsx` | ใหม่ — create/edit project + phases |
| `components/tasks/TaskModal.tsx` | + project/phase select fields |
| `components/tasks/DemoTaskCard.tsx` | ใหม่ |
| `components/tasks/DemoTaskModal.tsx` | ใหม่ |
| `components/views/DemoListView.tsx` | ใหม่ |
| `components/views/DemoCardView.tsx` | ใหม่ |
| `components/views/DemoKanbanView.tsx` | ใหม่ |
| `components/DemoShell.tsx` | ใหม่ |
| `app/(app)/dashboard/page.tsx` | + filter by currentProjectId |
| `app/(app)/tasks/page.tsx` | + filter by currentProjectId |
| `app/(app)/projects/page.tsx` | ใหม่ — projects list page |
| `app/test/layout.tsx` | ใหม่ |
| `app/test/page.tsx` | ใหม่ |
