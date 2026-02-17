FROM nginx:1.25-alpine

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

# nginx.conf is mounted as a volume in docker-compose.prod.yml
# This Dockerfile just provides the base image

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
