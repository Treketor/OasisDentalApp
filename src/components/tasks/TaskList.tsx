import type { Task } from '../../types/task'
import { PriorityPill } from '../ui/PriorityPill'
import { StatusPill } from '../ui/StatusPill'

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border bg-surface">
      {tasks.map((task) => (
        <article
          key={task.id}
          className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center"
        >
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PriorityPill priority={task.priority} />
              <StatusPill status={task.status} />
            </div>
            <h3 className="font-body text-base font-semibold normal-case text-text">{task.title}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{task.description}</p>
          </div>
          <div className="text-left text-sm text-muted md:text-right">
            <p className="font-semibold text-text">{task.assignee}</p>
            <p>{task.role}</p>
            <p>Due {task.dueDate}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
