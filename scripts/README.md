fill-order-numbers script

Purpose

- Assign persistent `orderNumber` to existing orders where `orderNumber` is NULL.

Run the ESM script with Node (from the ecommerce-admin-15 folder):

1. Make sure you have a backup of your database.
2. From project root (`ecommerce-admin-15`) ensure dependencies are installed and Prisma client is generated.

   npm install

   # If Prisma client isn't generated, run:

   npx prisma generate

3. Run the script with the ESM version:

   node scripts/fill-order-numbers.mjs

This project prefers ESM (.mjs) scripts to match the repository ESLint rules and avoid CommonJS `require()` usage. If you need to run the TypeScript variant during development, use `ts-node` locally, but avoid committing CommonJS versions.

Notes
