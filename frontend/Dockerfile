FROM node:20-alpine

WORKDIR /app

# Install dependencies using yarn (npm has exit handler bugs on alpine)
COPY package.json ./
RUN yarn install --network-timeout 600000 2>/dev/null || true
RUN ls -la node_modules/.bin/next || echo "NEXT NOT FOUND"

# Copy application code
COPY . .

# Build the application using full path
RUN ./node_modules/.bin/next build

# Expose port
EXPOSE 3000

# Run the application
CMD ["./node_modules/.bin/next", "start"]
