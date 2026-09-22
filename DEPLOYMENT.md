# Deploy to GitHub Pages

## Option A: upload through GitHub

1. Create a new GitHub repository.
2. Upload **the contents of this folder** to the repository root, including `.nojekyll`.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. When GitHub shows the published HTTPS address, open it on the Pixel 7 and use Chrome's **Install app** command.

## Option B: Git command line

```sh
git init
git add .
git commit -m "Publish Pixel Arcade"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPOSITORY.git
git push -u origin main
```

Then enable Pages from the `main` branch and repository root as described above.

## Updating safely

Upload the new files without clearing browser data. Local progress uses a separate, versioned storage key and is not part of the offline cache, so app updates preserve scores and settings. Change `CACHE_NAME` in `service-worker.js` whenever cached code changes. The new worker waits until the current game ends; the dashboard then offers an **Update now** button.

## Hosting notes

- All URLs are relative, so both `username.github.io/repository/` and a custom domain work.
- GitHub Pages provides the HTTPS required for installation and service workers.
- Do not remove `.nojekyll`; it keeps GitHub Pages from altering the static project.
- No secrets, environment variables, server functions, or build artifacts are needed.
