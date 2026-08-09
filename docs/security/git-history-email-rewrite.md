# Optional commit-email history rewrite

There are currently 49 reachable commits whose author or committer metadata
uses an address that is not a GitHub noreply address. Rewriting this history is
optional and intentionally not part of the security implementation.

## Why this is disruptive

A rewrite changes commit SHA identifiers for every affected commit and all
descendants. Existing commit signatures on rewritten commits become invalid.
Open pull requests, forks, local clones, tags, deployment references, and links
to old commit IDs can be disrupted. Every collaborator must coordinate and
normally reclone or carefully reset onto the rewritten history. Branch
protection may need a temporary, explicitly approved change.

Never begin this procedure without a maintenance window, collaborator agreement,
and explicit approval for the final force push.

## Preparation and backup

1. Obtain the exact GitHub noreply address from **GitHub → Settings → Emails**.
   Do not guess it.
2. Freeze pushes and merges.
3. Create a mirror-clone backup in a separate, access-controlled location:

   ```sh
   git clone --mirror REPOSITORY_URL sakhtanie-before-email-rewrite.git
   ```

4. Confirm the backup has all branches, tags, and remote refs, and preserve it
   until all collaborators have verified the new history.
5. Work in a second fresh mirror clone. Install and record the version of
   `git-filter-repo`; do not use the old `filter-branch` workflow.

## Replacement approaches

Prepare a private mailmap input that maps the old address to the exact GitHub
noreply address. Keep that mapping outside the public repository because the
mapping itself contains the address being removed. Run `git-filter-repo` with
its mailmap replacement option in the disposable mirror clone.

If multiple author/committer identities or conditional mappings are required,
use a reviewed `git-filter-repo` mailmap or callback that changes only exact
byte-for-byte matches in author and committer email fields. The callback must
not alter names, messages, dates, trees, or already-correct noreply addresses.

Consult the installed version's help before execution:

```sh
git filter-repo --help
```

## Verification without exposing addresses

- Count remaining non-noreply author and committer addresses with a script that
  emits only totals, never the address strings.
- Verify the expected count is zero on every rewritten branch and tag.
- Compare tree IDs or checked-out file hashes at corresponding tips to confirm
  file contents did not change.
- Compare branch/tag inventories and commit counts.
- Run the project's full validation, tests, build, audit, and secret scan.
- Review a mapping of old-to-new commit IDs in a private location; commit IDs
  will change even though file contents do not.
- Confirm rewritten commit signatures are absent/invalid as expected and decide
  whether new signed tip commits are required.

## Publication and collaborator recovery

The final mirror/force push is destructive and requires separate explicit
approval. Coordinate any temporary branch-protection change immediately before
publication and restore protection immediately afterward. Never perform a
force push while collaborators are still writing to the old history.

After publication, close or recreate affected pull requests, update deployment
references, and require collaborators to reclone (the safest option) or follow
a reviewed recovery procedure. Do not merge old-history branches back into the
rewritten repository. Retain the protected mirror backup until the migration is
fully accepted, then dispose of it according to the owner's retention policy.

For future commits, obtain the exact noreply address from **GitHub → Settings →
Emails**, then configure this repository:

```sh
git config user.email "THE_EXACT_GITHUB_NOREPLY_ADDRESS"
```

Use `git config --global user.email "THE_EXACT_GITHUB_NOREPLY_ADDRESS"` only if
the same identity should apply to every local repository.
