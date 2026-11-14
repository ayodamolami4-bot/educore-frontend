# Lead setup

The lead is `ayodamolami4-bot`. Do these steps before the four role developers start.

## If starting from the source ZIP

If the repository already contains this complete starter, skip this section.

1. Clone `https://github.com/ayodamolami4-bot/educore-frontend.git` into a new folder on your computer.
2. Extract the source ZIP somewhere else. Copy **the contents inside its `educore-frontend` folder** into your new clone. Include the dotfiles, especially `.github`, `.gitignore` and `.env.example`. Replace the initial README when asked. Do not copy an entire extra `educore-frontend` folder inside the clone.
3. The ZIP intentionally contains no `.git`, `node_modules`, local `.env` or generated build. Keep the `.git` directory created by your clone.
4. In the clone, run:

```sh
npm ci
npm run check
npm run format:check
npm run export:web
git add .
git commit -m "Add EduCore shared frontend foundation"
git push origin main
```

GitHub may ask you to sign in through your own Git client. Keep credentials out of source files. Do not force-push: cloning first preserves GitHub's initial commit.

## Assign each teammate

Ask each teammate for their GitHub username. Add them as a collaborator to the private repository using GitHub's normal invitation process. Then edit `team-ownership.json`:

```json
{
  "lead": "ayodamolami4-bot",
  "roles": {
    "admin": ["actual-admin-username"],
    "teacher": ["actual-teacher-username"],
    "student": ["actual-student-username"],
    "parent": ["actual-parent-username"]
  }
}
```

These are examples: replace them with the real usernames. Run `npm run team:owners`, then commit and push the mapping and generated `.github/CODEOWNERS` **before** a teammate opens a pull request. The check reads the mapping from main, so contributors cannot assign themselves another role in their own branch.

## Begin together

Give everyone the repository link, their role folder and the approved screen/API design. Each developer clones the same repository and creates a separate feature branch. Each role README explains how to register its screens without changing shared navigation. You review the pull request and merge it. Shared components and dependency changes come through you.

Review the GitHub Actions result after the first push. Local passing checks do not mean a workflow has already run on GitHub. The starter cannot enforce folder permissions or a lead-only merge rule on a free private repository; everyone must follow the review agreement.

The app starts in fictional demo mode. Backend integration is a separate step in [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md). Do not put real student records or service secrets in the demo fixtures.
