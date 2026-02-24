FROM node:20-alpine

WORKDIR /app

# Set PATH to include local node_modules
ENV PATH="/app/node_modules/.bin:$PATH"

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --prefer-offline

# Copy application code
COPY . .

# Build the application
RUN next build

# Expose port
EXPOSE 3000

# Run the application
CMD ["next", "start"]
