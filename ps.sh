# Run the frontend container
docker run -d --name frontend_container -p 8080:80 frontend-service

# Run the auth service container
docker run -d --name auth_container -p 5000:5000 auth-service

# Run the schedule service container
docker run -d --name schedule_container -p 5001:5001 schedule-service
