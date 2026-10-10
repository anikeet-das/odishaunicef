# Architecture rules

- Keep responsive shell and overflow safeguards in the shared layout and global stylesheet, with page-specific responsive classes for exceptions; this preserves desktop layouts and avoids inconsistent mobile fixes.
- Initialize theme with the same server/client default, restore preferences after mount, and tolerate blocked browser storage; this prevents hydration failures and keeps theme controls usable.