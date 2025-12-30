@echo off
echo Starting MySQL Docker Container...
docker-compose up -d
echo.
echo MySQL is starting...
echo.
echo Connection Details:
echo Host: localhost
echo Port: 3306
echo User: admin
echo Password: Apple#123
echo Root Password: Apple#123
echo Database: backup_db
echo.
echo Waiting for MySQL to be ready...
timeout /t 10 /nobreak
docker-compose ps
echo.
echo Done! MySQL is running.
pause
