@echo off
REM =============================================================================
REM Salen Hocam - Windows VPS Deployment Script
REM =============================================================================
REM Usage: scripts\deploy.bat [environment]
REM Example: scripts\deploy.bat production

SETLOCAL EnableDelayedExpansion

SET ENVIRONMENT=%1
IF "%ENVIRONMENT%"=="" SET ENVIRONMENT=production
SET PROJECT_NAME=salen_hocam

echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Salen Hocam - VPS Deployment Script
echo   Environment: %ENVIRONMENT%
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Check if .env file exists
IF NOT EXIST .env (
    echo [ERROR] .env file not found!
    echo Please create a .env file from .env.example
    exit /b 1
)

echo [1/6] Checking prerequisites...
where docker >nul 2>nul
IF ERRORLEVEL 1 (
    echo [ERROR] Docker is not installed
    exit /b 1
)

where docker-compose >nul 2>nul
IF ERRORLEVEL 1 (
    echo [ERROR] Docker Compose is not installed
    exit /b 1
)

echo [OK] Prerequisites check passed
echo.

echo [2/6] Stopping existing containers...
docker-compose -p %PROJECT_NAME% down 2>nul

echo [3/6] Building Docker images...
docker-compose -p %PROJECT_NAME% build --no-cache
IF ERRORLEVEL 1 (
    echo [ERROR] Failed to build Docker images
    exit /b 1
)

echo [4/6] Starting services...
docker-compose -p %PROJECT_NAME% up -d
IF ERRORLEVEL 1 (
    echo [ERROR] Failed to start services
    exit /b 1
)

echo [5/6] Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

REM Wait for backend to be healthy
SET MAX_RETRIES=30
SET RETRY_COUNT=0

:HEALTH_CHECK_LOOP
docker-compose -p %PROJECT_NAME% ps backend | findstr "healthy" >nul
IF NOT ERRORLEVEL 1 GOTO HEALTH_CHECK_SUCCESS

IF %RETRY_COUNT% GEQ %MAX_RETRIES% (
    echo [ERROR] Backend service failed to become healthy
    docker-compose -p %PROJECT_NAME% logs backend
    exit /b 1
)

SET /A RETRY_COUNT+=1
echo Waiting for backend to be healthy... (%RETRY_COUNT%/%MAX_RETRIES%)
timeout /t 2 /nobreak >nul
GOTO HEALTH_CHECK_LOOP

:HEALTH_CHECK_SUCCESS
echo [OK] Backend service is healthy
echo.

echo [6/6] Checking database connection...
REM Set default port if not set
IF "%BACKEND_PORT%"=="" SET BACKEND_PORT=3001

curl -s http://localhost:%BACKEND_PORT%/health | findstr "ok" >nul
IF NOT ERRORLEVEL 1 (
    echo [OK] Database is accessible
) ELSE (
    echo [WARNING] Database might need manual migration
    echo Run: docker-compose -p %PROJECT_NAME% exec postgres psql -U postgres -d salen_hocam -f /docker-entrypoint-initdb.d/001_init.sql
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo   Deployment Successful! 🎉
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Backend API: http://localhost:%BACKEND_PORT%
echo Health Check: http://localhost:%BACKEND_PORT%/health
echo.
echo To view logs: docker-compose -p %PROJECT_NAME% logs -f
echo To stop: docker-compose -p %PROJECT_NAME% down
echo.

ENDLOCAL
