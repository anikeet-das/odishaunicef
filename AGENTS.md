# Architecture rules

- Keep responsive shell and overflow safeguards in the shared layout and global stylesheet, with page-specific responsive classes for exceptions; this preserves desktop layouts and avoids inconsistent mobile fixes.
- Initialize theme with the same server/client default, restore preferences after mount, and tolerate blocked browser storage; this prevents hydration failures and keeps theme controls usable.
- Restore shared language, view mode and sidebar preferences after mount with guarded storage, and sync sidebar width through events; this keeps the entire shell interactive even when storage is restricted.