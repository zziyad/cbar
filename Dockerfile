# Use official Node.js image as the base
FROM node:latest

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all application files to the working directory
COPY . .

# Expose port 8000
EXPOSE 8000

# Command to run the Node.js application
CMD ["node", "cbar.js"]
