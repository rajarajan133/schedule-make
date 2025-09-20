# Build the frontend image
docker build -t frontend-service ./frontend

# Build the auth service image
docker build -t auth-service ./auth-service

# Build the schedule service image
docker build -t schedule-service ./schedule-service
