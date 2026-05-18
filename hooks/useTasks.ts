'use client'
import { useEffect, useCallback } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { fetchAllData } from '@/app/actions/tasks'

export function useTasks() {
  const { setTasks, setCategories, setActivityLog, setLoading } = useTaskStore()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { tasks, categories, activityLog } = await fetchAllData()
      setTasks(tasks)
      setCategories(categories)
      setActivityLog(activityLog)
    } finally {
      setLoading(false)
    }
  }, [setTasks, setCategories, setActivityLog, setLoading])

  useEffect(() => {
    fetchAll()
  }, [])

  return { fetchAll }
}
