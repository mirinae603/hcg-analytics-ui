FROM node:18

# Set the working directory inside the container
WORKDIR /app

# Ensure proper permissions
RUN chown -R node:node /app

# Copy the package.json and lock files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the default port
EXPOSE 3000

# Set environment variables
ENV NEXT_PUBLIC_GIT_BRANCH=unknown
ENV NODE_ENV=development
ENV PORT=3000

# Run the Next.js development server and ensure the port is dynamic
CMD ["sh", "-c", "npm run dev -- -p $PORT"]