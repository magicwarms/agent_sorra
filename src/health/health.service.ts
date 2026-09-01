import { checkHealth } from "./health.repository";

export const healthCheck = async () => {
  await checkDatabaseConnection();

  return {
    success: true,
    data: {},
    message: "Health check successful",
  };
};

export const checkDatabaseConnection = async () => {
  try {
    // Run a simple query to confirm the database is reachable and active
    await checkHealth();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
    process.exit(1); // Exit process if the connection fails
  }
};
