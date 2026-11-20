-- AlterTable
ALTER TABLE "WorkflowStatus" ADD COLUMN     "isDecision" BOOLEAN NOT NULL DEFAULT false;

-- Numérotation des références lisibles (KM-AAAA-000001). Une séquence garantit
-- l'unicité même lorsque plusieurs dossiers sont déposés au même instant.
CREATE SEQUENCE IF NOT EXISTS "dossier_reference_seq" START 1;
