# Working together without overwriting each other

1. Lead assigns your GitHub username and role in team-ownership.json and grants repository access.
2. Pull main and create a short-lived feature branch.
3. Work only in src/features/<your-role>/. Keep role-specific tests next to that role or ask the lead for shared test changes.
4. Ask the lead for shared component, configuration, dependency or navigation changes.
5. Run npm run check and npm run format:check. Open a pull request with screen IDs, endpoint references and validation notes.
6. The lead reviews Files changed and the running UI, then merges. Do not push directly to main.

Git combines changes to different files and flags conflicts that require review. Do not copy a whole old project folder over the current project to resolve a conflict. Never commit node_modules, .env, native signing keys or real student/parent data.

The folder guard uses the ownership mapping from the PR base commit, so a contributor cannot approve their own expanded scope by changing their PR's mapping. It flags every changed or removed/renamed path outside the contributor's role. The base branch guard script is used in CI. GitHub plan limitations still mean this is a check/review process, not a repository-level folder ACL.
