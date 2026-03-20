FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Railway injects env vars at build time; Vite needs VITE_* vars during build
ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build

RUN npm install -g serve
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
