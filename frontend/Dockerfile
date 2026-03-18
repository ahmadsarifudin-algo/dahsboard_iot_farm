FROM node:20-alpine

WORKDIR /app

# Install dependencies using yarn (npm has exit handler bugs on alpine)
COPY package.json ./
RUN yarn install --network-timeout 600000 2>/dev/null || true
RUN ls -la node_modules/.bin/next || echo "NEXT NOT FOUND"

# Copy application code
COPY . .

# Next.js bakes NEXT_PUBLIC_* env vars at build time — accept as build args
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ARG NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
ARG NEXT_PUBLIC_MQTT_URL=ws://broker.chickinindonesia.com:8083/mqtt
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_MQTT_URL=$NEXT_PUBLIC_MQTT_URL

# Build the application using full path
RUN ./node_modules/.bin/next build

# Expose port
EXPOSE 3000

# Run the application
CMD ["./node_modules/.bin/next", "start"]
