# Issue tracker: GitHub

Issues and specs live in GitHub Issues for
`natasha-audrey/lastfm-collage-generator-frontend`.

Use gh from this repository, or pass
--repo natasha-audrey/lastfm-collage-generator-frontend explicitly.

## Operations

- Create: gh issue create --title "..." --body-file <path>
- Read: gh issue view <number> --comments
- List: gh issue list --state open --json number,title,body,labels,assignees
- Comment: gh issue comment <number> --body-file <path>
- Label: gh issue edit <number> --add-label "..." or --remove-label "..."
- Close: gh issue close <number>

Write multiline bodies to a file and use --body-file.
Publishing to the issue tracker means creating a GitHub issue.
Fetching a ticket means reading the issue and its comments.

## Pull requests as a triage surface

PRs as a request surface: no.

Issues and PRs share a number space. For ambiguous references,
try gh pr view <number>, then gh issue view <number>.

## Wayfinding operations

- Maps are issues labelled wayfinder:map.
- Tickets are native GitHub sub-issues labelled wayfinder:<type>.
- List children: GET repos/<owner>/<repo>/issues/<map>/sub_issues.
- Attach children: POST to that endpoint with sub_issue_id set
  to the child's numeric database id.
- Add blockers: POST repos/<owner>/<repo>/issues/<ticket>/dependencies/blocked_by
  with issue_id set to the blocker's numeric database id.
- Retrieve database ids with gh api repos/<owner>/<repo>/issues/<number> --jq .id.
- The frontier is open, unassigned children with no open blockers.
  Inspect native dependencies; select the first eligible child in map order.
- Claim before work: gh issue edit <number> --add-assignee @me.
- Resolve by posting a resolution comment, closing the ticket,
  and adding a linked gist to the map's Decisions so far.
- Refer to maps and tickets by linked title.
