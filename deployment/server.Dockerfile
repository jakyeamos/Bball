# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory to /app
WORKDIR /app

# Copy root package.json and package-lock.json
COPY package*.json ./

# Copy server package.json
COPY server/package*.json ./server/

# Copy shared package.json
COPY shared/package*.json ./shared/

# Install all dependencies
RUN npm install

# Copy the rest of the application's code
COPY . .

# Build the TypeScript code
RUN npm run build --workspace=server

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the app when the container launches
CMD ["npm", "start", "--workspace=server"]
