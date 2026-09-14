# Expense Tracker

A local-first Expo expense tracker. Expenses, analytics eligibility, and Excel exports work on the device; SQLite is the only persistence layer. There are no accounts, API calls, cloud databases, or remote sync in this release.

## Local development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
docker compose up --build
```

The container serves the Expo web export at `http://localhost:8080`. Mobile applications remain device-local and are released separately using EAS.

## Production delivery

GitHub Actions runs tests, linting, a Docker build, and a Trivy image scan. On `main`, it pushes the scanned image to ECR and deploys an ECS Fargate service behind an Application Load Balancer. Terraform deliberately provisions only ECR, ECS, ALB/network security groups, CloudWatch logs, and the minimal ECS image-pull/logging role.

Before deployment, provide an existing VPC and two public subnet IDs through the GitHub environment secrets `AWS_VPC_ID` and `AWS_PUBLIC_SUBNET_IDS` (HCL list form, for example `["subnet-a", "subnet-b"]`), plus an OIDC deployment role ARN in `AWS_DEPLOY_ROLE_ARN`. The role must be scoped to these deployment resources; do not add permanent AWS access keys to GitHub.

ECS Fargate and an Application Load Balancer incur AWS charges. This architecture is deliberately small, but it is not a permanently free deployment. Configure AWS Budgets and cost alerts before applying Terraform.

## Future cloud migration

The expense model is isolated in `context/ExpenseContext.tsx`. If requirements later introduce accounts or sync, add a versioned sync adapter beside the SQLite repository and migrate only opt-in data. That can introduce an API, authentication, and a database without changing the existing local-first user experience.
