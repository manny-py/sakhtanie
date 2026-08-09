# Recommended protection for `main`

Apply these settings manually in GitHub after the new workflows have run at
least once and their exact check names are visible:

- require a pull request before merging;
- require at least one approving review;
- dismiss stale approvals when new commits are pushed;
- require all review conversations to be resolved;
- require the CI verification job as a status check;
- require the CodeQL analysis/security check where the repository plan supports
  GitHub code scanning;
- require the branch to be up to date before merging if the team accepts the
  additional merge queue/rebase cost;
- block force pushes;
- block branch deletion;
- do not allow bypass except for a documented emergency role.

Optional controls:

- require linear history if merge commits are not part of the project's chosen
  workflow;
- require signed commits after every contributor has signing configured.

Dependabot alerts, Dependabot security updates, secret scanning, and push
protection should also be enabled in repository security settings when they are
available for the repository plan. Configuration files alone cannot enable all
of these GitHub-side features.
