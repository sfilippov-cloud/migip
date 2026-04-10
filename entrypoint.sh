#!/bin/sh
set -e

echo "Running Prisma db push..."
npx prisma db push --skip-generate
echo "Database schema synced."

echo "Starting server..."
exec node server.js
