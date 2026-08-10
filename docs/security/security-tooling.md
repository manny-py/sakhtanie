# Security tooling trust boundaries

## Secret scanner filesystem safety

The current-tree scanner never validates one pathname and then reopens it. For
each directory entry it skips traversal symlinks, opens once with `O_RDONLY`
and `O_NOFOLLOW` where available, and uses `fstat` on that descriptor for the
regular-file and size checks. A post-open `lstat` identity comparison fails
closed if the entry changed during open. The content is read from the same file
descriptor and that descriptor is closed in `finally`. Directory traversal also
skips symlink entries, unreadable entries, and the existing ignored directories.

This removes the prior check-then-read race: changing the pathname after the
open cannot change the already-open object that is checked and read.

## Logo refresh network safety

Repository JSON selects stable official-source identifiers only. A code-owned
switch maps approved identifiers to literal request URLs. CanIVibeCodeIt asset
paths must match a narrow relative-path grammar and are resolved against a fixed
code-owned HTTPS origin, so data files cannot replace the scheme or host.

Every initial request and every manually resolved redirect must use HTTPS, have
no credentials or custom port, and match an exact hostname allowlist. IP
literals, lookalikes, implicit subdomains, downgrades, malformed targets, and
redirect chains over five hops are rejected. Requests have per-attempt timeouts
and bounded retries. Manifest and image bodies have separate limits enforced
against both `Content-Length` and the streamed bytes.

Remote images require an approved MIME type and compatible magic bytes. Remote
SVG is rejected even when mislabeled. Curated and generated local SVG is checked
for active elements, event attributes, scripting schemes, HTML data URLs, and
remote resource references.

Slugs, domains, output names, and curated paths have strict grammars. Resolved
paths must remain inside their expected directory. Files are written through
exclusive same-directory temporary files and atomic rename. A complete staging
asset directory is swapped into place only after all output validates, so a
failed refresh preserves the previous public asset set.
