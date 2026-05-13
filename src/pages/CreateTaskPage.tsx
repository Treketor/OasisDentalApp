import { TaskForm } from '../components/tasks/TaskForm'

export function CreateTaskPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-5xl font-bold uppercase text-text">Create Task</h1>
        <p className="mt-2 text-muted">
          Draft a clear handover item. Keep patient context to initials or an internal reference only.
        </p>
      </div>
      <TaskForm />
    </div>
  )
}
