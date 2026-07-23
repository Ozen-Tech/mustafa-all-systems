-- Permite deletar usuário com visitas / rotas supervisionadas
ALTER TABLE "Visit" DROP CONSTRAINT IF EXISTS "Visit_promoterId_fkey";
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_promoterId_fkey"
  FOREIGN KEY ("promoterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteAssignment" DROP CONSTRAINT IF EXISTS "RouteAssignment_supervisorId_fkey";
ALTER TABLE "RouteAssignment" ADD CONSTRAINT "RouteAssignment_supervisorId_fkey"
  FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
