#bin/bash 
docker stop schedule_container
docker rm schedule_container

docker stop frontend_container
docker rm frontend_container

docker stop auth_container
docker rm auth_container
