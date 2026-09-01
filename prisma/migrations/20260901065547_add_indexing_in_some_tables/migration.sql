-- DropIndex
DROP INDEX "session_userId_idx";

-- CreateIndex
CREATE INDEX "session_userId_token_idx" ON "session"("userId", "token");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");
