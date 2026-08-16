FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY eas-project ./eas-project
COPY src ./src
EXPOSE 3001
# Requires EXPO_TOKEN (an EAS robot/personal access token) at runtime so
# eas-cli can list builds non-interactively. See README for how to create one.
CMD ["node", "src/server.js"]
