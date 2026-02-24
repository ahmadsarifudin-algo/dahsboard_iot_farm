FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Copy application code
COPY . .

# Build the application
RUN npx next build

# Expose port
EXPOSE 3000

# Run the application
CMD ["npx", "next", "start"]
