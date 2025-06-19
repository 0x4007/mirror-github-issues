# Mirror GitHub Issues

A tool to progressively mirror issues from a source repository to a target repository, with smart caching and duplicate detection.

## Features

- **Progressive Mirroring**: Copies issues in batches (default: 3 per run)
- **Smart Caching**: Caches source repository issues for 1 hour to avoid repeated API calls
- **Mirror Issue Detection**: Identifies when an issue body contains only a GitHub URL and fetches the referenced content
- **Duplicate Prevention**: Prevents creating duplicate issues by comparing title and body content
- **Configurable Batch Size**: Customize how many issues to copy per run

## Usage

### Local Development

1. Set up environment variables:
   ```bash
   export GITHUB_TOKEN="your_github_token"
   export TARGET_REPO="owner/repo"  # Optional, defaults to ShivTestOrg/repo-price
   export BATCH_SIZE="3"            # Optional, defaults to 3
   ```

2. Run the script:
   ```bash
   bun run src/mirror-issues.ts
   ```

### GitHub Actions

This repository includes a GitHub Action that can be triggered manually from the Actions tab.

#### Setup

1. **Set Repository Variables** (optional):
   - Go to Settings → Secrets and variables → Actions → Variables
   - Add `TARGET_REPO` with value like `owner/repo-name`

2. **GitHub Token**: The action uses `GITHUB_TOKEN` automatically (no setup needed)

#### Running the Action

1. Go to the **Actions** tab in your repository
2. Select **"Mirror Issues"** workflow
3. Click **"Run workflow"**
4. Configure options:
   - **Number of issues to copy**: How many issues to process (default: 3)
   - **Force refresh cache**: Check to ignore cached data and fetch fresh issues

#### Action Features

- **Manual Dispatch**: Run on-demand from GitHub UI
- **Configurable Batch Size**: Choose how many issues to copy per run
- **Cache Management**: Option to force refresh the source issues cache
- **Automatic Cache Commits**: Updates and commits the cache file back to the repository after each run
- **Artifact Upload**: Saves cache file as artifact for faster subsequent runs (backup)

## How It Works

1. **Load Existing Issues**: Fetches all issues from the target repository
2. **Load Source Issues**: Uses cached data or fetches from source repository (ubiquity/devpool-directory)
3. **Process Issues**: Checks each source issue to determine if it needs to be copied:
   - **Mirror Issues**: Issues with body containing only a GitHub URL → fetches referenced issue's title and body
   - **Regular Issues**: Issues with multiple URL references → combines referenced content
4. **Skip Duplicates**: Compares title and body to avoid creating duplicates
5. **Copy Batch**: Creates the specified number of new issues in the target repository

## Example Output

```
Loading existing issues from target repository...
Found 15 existing issues in target repository
Loading source issues...
Using cached data from 6/20/2025, 2:49:24 AM
Found 1675 issues in source repository
Finding next 3 issues to copy...
Found issue to copy: Handle multiple pull-requests against one issue
Found issue to copy: Save Every Registered Wallet
Found issue to copy: Credit users for their edits in a comment

Copying 3 new issues...
Created mirror issue: Handle multiple pull-requests against one issue
Created mirror issue: Save Every Registered Wallet
Created mirror issue: Credit users for their edits in a comment

Progress: 18 issues copied so far
Checked 18/1675 source issues
```

## Configuration

### Environment Variables

- `GITHUB_TOKEN`: GitHub personal access token (required)
- `TARGET_REPO`: Target repository in format `owner/repo` (optional)
- `BATCH_SIZE`: Number of issues to copy per run (optional, default: 3)

### Cache

- Source issues are cached for 1 hour in `source-issues-cache.json`
- Cache can be manually cleared by deleting the file or using the "force refresh" option in GitHub Actions
- Cache file is automatically committed to the repository after each GitHub Actions run
- This ensures the cache persists across runs and stays up-to-date

## Development

### Prerequisites

- [Bun](https://bun.sh/) runtime
- GitHub personal access token with repository access

### Project Structure

```
src/
├── mirror-issues.ts      # Main script
├── github-client.ts      # GitHub API client setup
├── get-referenced-issue.ts # Fetch referenced issue content
└── cache.ts             # Caching functionality

.github/workflows/
└── mirror-issues.yml    # GitHub Actions workflow
```

### Running Tests

```bash
# Test with custom batch size
BATCH_SIZE=2 bun run src/mirror-issues.ts

# Test with different target repo
TARGET_REPO="owner/repo" bun run src/mirror-issues.ts
