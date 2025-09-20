# Use an official Nginx image as a base
FROM nginx:alpine

# Copy the frontend files into the Nginx public directory
COPY . /usr/share/nginx/html

# Expose port 80 for Nginx
EXPOSE 80

# Command to start Nginx
CMD ["nginx", "-g", "daemon off;"]