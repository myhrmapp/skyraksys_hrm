# CI/CD Workflow Templates

This directory contains GitHub Actions workflows for automated testing and deployment.

## Workflows

### 1. `test.yml` - Continuous Integration
**Triggers:** Push/PR to `main` or `develop` branches

**Jobs:**
- **Validate**: Route validation, environment checks
- **Backend Tests**: Unit/integration tests with PostgreSQL
- **Frontend Tests**: React component tests
- **E2E Tests**: Playwright smoke tests
- **Security**: npm audit scans
- **Build**: Production build verification

**Status Badge:**
```markdown
![CI Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)
```

### 2. `deploy.yml` - Continuous Deployment
**Triggers:** 
- Push to `main` (deploys to staging)
- Tags `v*` (deploys to production)
- Manual dispatch with environment choice

**Jobs:**
- **Pre-deploy**: Validation checks
- **Build**: Create deployment package
- **Deploy Staging**: Auto-deploy to staging
- **Deploy Production**: Deploy to production (requires approval)
- **Post-deploy**: Health checks and monitoring

**Status Badge:**
```markdown
![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)
```

### 3. `code-quality.yml` - Code Quality Checks
**Triggers:** Push/PR to `main` or `develop` branches

**Jobs:**
- **Lint**: ESLint checks for backend and frontend
- **Console Audit**: Scan for console.log statements
- **Code Metrics**: LOC counts and statistics

**Status Badge:**
```markdown
![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/code-quality.yml/badge.svg)
```

## Setup Instructions

### 1. GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

**Required for Deployment:**
- `REACT_APP_API_URL` - Production API URL
- `STAGING_SSH_USER` - SSH user for staging server (if using SSH)
- `STAGING_HOST` - Staging server hostname
- `PROD_SSH_USER` - SSH user for production server
- `PROD_HOST` - Production server hostname

**Optional:**
- `SLACK_WEBHOOK` - For deployment notifications
- `SENTRY_DSN` - Error tracking
- Database credentials (if deploying fresh instances)

### 2. Environment Setup

Create GitHub Environments (`Settings > Environments`):

**Staging:**
- No required reviewers
- Auto-deploy on push to `main`

**Production:**
- Add required reviewers
- Enable branch protection
- Only allow tags `v*`

### 3. Customize Deployment Scripts

The workflows use placeholder deployment commands. Update these sections:

**In `deploy.yml`:**

```yaml
# Deploy to staging server
- name: Deploy to staging server
  run: |
    # Replace with your deployment method:
    
    # Option 1: SSH/rsync
    rsync -avz deploy/ ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }}:/app
    ssh ${{ secrets.STAGING_USER }}@${{ secrets.STAGING_HOST }} "cd /app && pm2 restart all"
    
    # Option 2: Docker
    docker build -t myapp:${{ github.sha }} .
    docker push myregistry.com/myapp:${{ github.sha }}
    ssh ${{ secrets.STAGING_HOST }} "docker pull myregistry.com/myapp:${{ github.sha }} && docker-compose up -d"
    
    # Option 3: Cloud provider (AWS, Azure, GCP)
    # Use provider-specific GitHub Actions
```

### 4. Local Testing

Test workflows locally using [act](https://github.com/nektos/act):

```bash
# Install act
choco install act

# Run all workflows
act

# Run specific workflow
act -j backend-tests

# Run with secrets
act -s GITHUB_TOKEN=your_token
```

## Workflow Features

### ✅ Automated Validation
- Route configuration checks
- Environment variable validation
- Pre-deployment safety checks
- Security audits

### 🧪 Comprehensive Testing
- Backend unit/integration tests
- Frontend component tests
- E2E smoke tests
- Coverage reporting

### 🚀 Safe Deployment
- Separate staging/production environments
- Required approvals for production
- Health checks after deployment
- Automatic rollback on failure

### 📊 Quality Monitoring
- ESLint enforcement
- Prettier formatting checks
- Console.log detection
- Code metrics tracking

## Branch Strategy

```
main
├── Auto-deploys to staging
├── Creates deployment package
└── Tag v* → Deploy to production

develop
├── Runs all tests
├── Runs quality checks
└── No deployment

feature/*
└── Runs tests on PR
```

## Example: Full Release Flow

1. **Feature Development:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   ```
   - Opens PR → Runs tests and quality checks

2. **Merge to Main:**
   ```bash
   git checkout main
   git merge feature/new-feature
   git push origin main
   ```
   - Runs full test suite
   - Deploys to staging automatically

3. **Production Release:**
   ```bash
   git tag -a v1.2.3 -m "Release 1.2.3"
   git push origin v1.2.3
   ```
   - Requires production environment approval
   - Deploys to production
   - Creates GitHub Release

## Status Badges for README

Add all badges to your main README.md:

```markdown
# SkyrakSys HRM

![CI Tests](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/test.yml/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)
![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/code-quality.yml/badge.svg)

Human Resources Management System
```

## Troubleshooting

### Tests fail on CI but pass locally
- Check Node.js version matches (22.x)
- Verify environment variables are set correctly
- Check database connection (PostgreSQL 17)

### Deployment fails
- Verify all secrets are configured
- Check server connectivity
- Review deployment logs in Actions tab

### Slow workflow execution
- Use `cache: 'npm'` for Node.js setup (already included)
- Consider splitting large test suites
- Use matrix strategy for parallel jobs

## Custom Workflows

Create additional workflows for:
- **Scheduled tasks**: `on: schedule: - cron: '0 0 * * *'`
- **Issue management**: Auto-label, auto-assign
- **Dependency updates**: Dependabot integration
- **Performance testing**: Lighthouse audits

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
