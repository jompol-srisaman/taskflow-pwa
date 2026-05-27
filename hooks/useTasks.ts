'use client'
import { useCallback } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { fetchAllData } from '@/app/actions/tasks'

export function useTasks() {
  const { setTasks, setCategories, setActivityLog, setProjects, setPhases, setProjectNotes, setLoading } = useTaskStore()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { tasks, categories, activityLog, projects, phases, projectNotes } = await fetchAllData()
      setTasks(tasks)
      setCategories(categories)
      setActivityLog(activityLog)
      setProjects(projects)
      setPhases(phases)
      setProjectNotes(projectNotes)
    } catch {
      // silently fail — UI stays with previous state
    } finally {
      setLoading(false)
    }
  }, [setTasks, setCategories, setActivityLog, setProjects, setPhases, setProjectNotes, setLoading])

  return { fetchAll }
}
