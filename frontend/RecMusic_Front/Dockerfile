# Use official Node.js image
FROM node:18-alpine

# Set working directory inside the container
WORKDIR /app

COPY ./package.json ./

COPY ./package-lock.json ./

RUN npm install

# Copy all project files
COPY . .

# Expose the React port
EXPOSE 5173

# Start the React development server
CMD ["npm", "run", "dev"]
