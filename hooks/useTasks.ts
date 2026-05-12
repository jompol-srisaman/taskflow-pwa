'use client'
import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useTaskStore } from '@/store/taskStore'
import { PRESET_CATEGORIES } from '@/lib/utils'
import type { Task, Category, ActivityLog } from '@/types'

export function useTasks(userId: string) {
  const { setTasks, setCategories, setActivityLog, setLoading, upsertTask, removeTask, upsertCategory } = useTaskStore()
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [tasksRes, catsRes, logRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, category:categories(*), subtasks(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
        .order('sort_order'),
      supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100),
    ])

    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (catsRes.data) setCategories(catsRes.data as Category[])
    if (logRes.data) setActivityLog(logRes.data as ActivityLog[])
    setLoading(false)
  }, [userId])

  // Realtime subscription
  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel(`tasks:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            removeTask(payload.old.id)
          } else {
            // Refetch with joins on insert/update
            const { data } = await supabase
              .from('tasks')
              .select('*, category:categories(*), subtasks(*)')
              .eq('id', payload.new.id)
              .single()
            if (data) upsertTask(data as Task)
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            useTaskStore.getState().removeCategory(payload.old.id)
          } else {
            upsertCategory(payload.new as Category)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return { fetchAll }
}

export function useTaskActions(userId: string) {
  const supabase = createClient()

  async function createTask(data: Partial<Task>) {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({ ...data, user_id: userId })
      .select('*, category:categories(*), subtasks(*)')
      .single()

    if (!error && task) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        task_id: task.id,
        action: 'created',
        task_title: task.title,
      })
    }
    return { task, error }
  }

  async function updateTask(id: string, data: Partial<Task>) {
    const { error } = await supabase.from('tasks').update(data).eq('id', id)
    return { error }
  }

  async function toggleTaskDone(task: Task) {
    const isDone = task.status !== 'done'
    const { error } = await supabase.from('tasks').update({
      status: isDone ? 'done' : 'todo',
      completed_at: isDone ? new Date().toISOString() : null,
    }).eq('id', task.id)

    if (!error && isDone) {
      await supabase.from('activity_log').insert({
        user_id: userId,
        task_id: task.id,
        action: 'completed',
        task_title: task.title,
      })
    }
    return { error }
  }

  async function deleteTask(task: Task) {
    await supabase.from('activity_log').insert({
      user_id: userId,
      task_id: task.id,
      action: 'deleted',
      task_title: task.title,
    })
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    return { error }
  }

  async function ensurePresetCategories() {
    const { data: existing } = await supabase
      .from('categories')
      .select('name')
      .eq('user_id', userId)
      .eq('is_preset', true)

    const existingNames = new Set(existing?.map(c => c.name) ?? [])
    const toInsert = PRESET_CATEGORIES
      .filter(c => !existingNames.has(c.name))
      .map(c => ({ ...c, user_id: userId }))

    if (toInsert.length > 0) {
      await supabase.from('categories').insert(toInsert)
    }
  }

  return { createTask, updateTask, toggleTaskDone, deleteTask, ensurePresetCategories }
}
