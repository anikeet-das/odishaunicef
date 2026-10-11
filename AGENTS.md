# Architecture rules

- Keep responsive shell and overflow safeguards in the shared layout and global stylesheet, with page-specific responsive classes for exceptions; this preserves desktop layouts and avoids inconsistent mobile fixes.
- Initialize theme with the same server/client default, restore preferences after mount, and tolerate blocked browser storage; this prevents hydration failures and keeps theme controls usable.
- Restore shared language and view mode preferences after mount with guarded storage; this keeps the entire shell interactive even when storage is restricted.
- Desktop sidebar expands on pointer hover or keyboard focus, collapses when neither remains, and synchronizes width through events; this removes the manual toggle while retaining keyboard access.
- Share the school-and-water assistant mark across chat entry points; this keeps the WASH assistant identity consistent.