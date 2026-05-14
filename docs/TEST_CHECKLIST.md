# Manual Test Checklist

## Auth

- Register a new account.
- Confirm pending approval screen appears.
- Approve the user as manager/admin.
- Log in and log out.

## Tasks

- Create a task manually.
- Assign a task.
- Pick a due date with the calendar/time picker.
- Update title, status, priority, category, and due date.
- Add a comment.
- Complete a task.
- Cancel a task.
- Delete as manager/admin.
- Confirm normal staff cannot delete.
- Confirm an assigned non-creator can update status and comment, but cannot edit task details.

## Notifications

- Task assigned notification appears.
- Comment notification appears.
- Status changed notification appears.
- Mark one notification read.
- Mark all notifications read.

## Team

- Approve pending staff.
- Reject pending staff.
- Deactivate approved staff.
- Update role.
- Confirm normal staff cannot access management controls.

## Hidden Product Surfaces

- Confirm task template controls are not visible in New Task, Manage, or Search.
- Confirm saved view controls are not visible in Tasks.

## Workspace Settings

- Add, rename, deactivate, and reorder a task category.
- Create a task with a custom task category.
- Add, rename, and deactivate a staff category.
- Assign a staff category to a staff profile.
- Toggle assigned-staff task detail editing and confirm it affects the task modal.
- Confirm normal staff cannot access admin workspace settings.

## Account

- Edit display name when allowed.
- Change password.
- Confirm staff category is read-only unless the workspace permission is enabled.

## Handover

- Create a note.
- Pin and unpin a note.
- Resolve a note.
- Edit own note.
- Confirm delete permissions for manager/admin only.

## Search

- Find a task result.
- Find a handover result.
- Find a staff result.
- Test Ctrl+K or Cmd+K.
- Test mobile search modal.
- Confirm background click and Escape close search.

## Responsive

- Desktop layout.
- iPad/tablet layout.
- Mobile layout.

## Production

- Vercel build succeeds.
- Direct route reload works.
- Task clicks open the centered modal without navigating away from Today or Tasks.
- Task modal closes by background click and Escape.
- Notification panel closes by outside click and Escape.
- Offline banner appears.
- Print task detail works.
- CSV export downloads and opens correctly.
- Error boundary fallback appears when forced.
- 404 page appears for unknown routes.
