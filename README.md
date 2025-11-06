# Sparrow Tags

## Quick start

After cloning the repo:

```bash
# Install packages
yarn
# AWS profile is required for SST commands
AWS_PROFILE=<profile> yarn dev
```

Connecting to a database in a private VPC:

```bash
AWS_PROFILE=<profile> torpedo  # See https://github.com/sst/torpedo
```

Deploying to prod:

```bash
AWS_PROFILE=<profile> yarn deploy --stage prod
```

## Template App

When using this as a template:

```
# Replace sparrow-tags names
npx replace-in-file '/sparrow-tags/g' '<app-slug>' '**/*' '*' '**/*' '*' --ignore 'README.md' --verbose
npx replace-in-file '/Sparrow Tags/g' '<App Name>' '**/*' '*' '**/*' '*' --ignore 'README.md' --verbose
npx replace-in-file '/sparrowtags.com/g' '<appdomain.com>' '**/*.*' '*.*' '**/*' '*' --ignore 'README.md' --verbose

# Change git repo
git remote rm origin
git remote add origin <repo url>
```
