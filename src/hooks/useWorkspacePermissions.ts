import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getWorkspacePermissions, updateWorkspacePermission } from '../lib/workspacePermissions'
import { supabase } from '../lib/supabase'
import { toPermissionMap, type WorkspacePermissionKey } from '../lib/workspaceSettings'
import type { WorkspacePermission } from '../types/database'

export function useWorkspacePermissions() {
  const channelIdRef = useRef(crypto.randomUUID())
  const [data, setData] = useState<WorkspacePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getWorkspacePermissions())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0)
    const channel = supabase
      .channel(`workspace-permissions-${channelIdRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_permissions' }, () => void refresh())
      .subscribe()
    return () => {
      window.clearTimeout(timeoutId)
      void supabase.removeChannel(channel)
    }
  }, [refresh])

  const update = useCallback(async (key: WorkspacePermissionKey, enabled: boolean) => {
    setData((current) => current.map((permission) => (permission.key === key ? { ...permission, enabled } : permission)))
    try {
      const permission = await updateWorkspacePermission(key, enabled)
      setData((current) => current.map((item) => (item.key === key ? permission : item)))
      return permission
    } catch (err) {
      await refresh()
      throw err
    }
  }, [refresh])

  const values = useMemo(() => toPermissionMap(data), [data])

  return { data, values, loading, error, refresh, update }
}
