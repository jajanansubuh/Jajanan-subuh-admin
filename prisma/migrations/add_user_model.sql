// schema.prisma
model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  role      String   @default("CUSTOMER") // Can be "ADMIN", "CUSTOMER"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  reviews   Review[] // Relation to reviews
}