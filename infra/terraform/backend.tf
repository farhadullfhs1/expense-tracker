terraform {
  backend "s3" {
    bucket       = "expense-tracker-tfstate-20260916"
    key          = "expense-tracker/prod/terraform.tfstate"
    region       = "ap-northeast-2"
    encrypt      = true
    use_lockfile = true
  }
}