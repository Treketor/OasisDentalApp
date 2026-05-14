# Privacy-Oriented Design Notes

These notes describe intended privacy practices for Oasis Tasks. They are not a claim of legal compliance.

## Appropriate Data

Oasis Tasks should store operational workflow information:

- Task titles and non-sensitive descriptions
- Staff assignments
- Due dates, priority, status, and category
- Patient initials or internal references only
- Shift handover notes for operational reminders
- Comments and activity needed for accountability

## Data To Avoid

Staff should not enter:

- Full patient names
- Diagnosis details
- Treatment notes
- Clinical histories
- Sensitive medical information
- Information that belongs in the clinical record system

## Exports

CSV exports may contain internal references and operational notes. Exported files should stay inside approved clinic systems and should not be shared externally.

## Access Expectations

- New accounts require approval.
- Manager/admin access should be limited to staff who need it.
- RLS policies are the source of truth for data access.
- Normal staff should not manage templates, users, or exports.

## Future Improvements

- Server-side audit event generation
- Server-side notification fan-out
- Formal retention policy for completed/cancelled tasks
- Optional MFA enforcement through Supabase Auth
- Periodic access review for inactive staff
