# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including devDependencies)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files and install ONLY production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy the built files from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Run the production build
CMD ["npm", "run", "start:prod"]