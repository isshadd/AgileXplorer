FROM node:22

# Install Angular CLI
RUN npm install -g @angular/cli@19.1.5

WORKDIR /app
COPY . .

RUN npm ci && npm install @angular/material @angular/cdk

# Build and serve
EXPOSE 4200
CMD ["ng", "serve", "--host", "0.0.0.0"]
