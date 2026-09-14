$ErrorActionPreference = "Stop"

function Run-Check {
    param(
        [string]$Name,
        [scriptblock]$Command
    )

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host $Name -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan

    & $Command

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "FAILED: $Name" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host "PASSED: $Name" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " Expense Tracker - Quality Gate" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

Run-Check "1/6 TypeScript typecheck" {
    pnpm typecheck
}

Run-Check "2/6 ESLint" {
    pnpm lint
}

Run-Check "3/6 Vitest" {
    pnpm test
}

Run-Check "4/6 Terraform formatting" {
    pnpm infra:fmt
}

Run-Check "5/6 Terraform validation" {
    pnpm infra:validate
}

Run-Check "6/6 Docker build" {
    docker build --tag expense-tracker:quality .
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " QUALITY GATE PASSED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
