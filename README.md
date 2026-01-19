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

# Create base .env.local
cat > .env.local <<EOF
DATABASE_NAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_USER=postgres
DATABASE_HOST=localhost
EOF

# Set local postgres port and create .env.local
npx replace-in-file '/54321/g' '<port>' '*' 'infra/*' --ignore 'README.md' --verbose
echo 'DATABASE_PORT=<port>' >> .env.local

# Install dependencies
yarn

# Initialize sst
AWS_PROFILE=<profile> yarn sst install
```
