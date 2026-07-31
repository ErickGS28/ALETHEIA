-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SOLICITANTE', 'ADMINISTRADOR', 'ABOGADO', 'APROBADOR', 'FIRMANTE');

-- CreateEnum
CREATE TYPE "TransitionAction" AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'RETURN', 'CANCEL', 'RECOVER', 'SIGN');

-- CreateTable
CREATE TABLE "WorkflowStage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "slaHours" INTEGER NOT NULL DEFAULT 48,
    "roleRequired" "Role" NOT NULL,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkflowStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractWorkflow" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "stageId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,
    "createdById" INTEGER,

    CONSTRAINT "ContractWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowTransition" (
    "id" SERIAL NOT NULL,
    "contractWorkflowId" INTEGER NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "action" "TransitionAction" NOT NULL,
    "comment" TEXT,
    "performedBy" INTEGER NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "role" "Role",
    "contractId" INTEGER,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "contractId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContractWorkflow_contractId_key" ON "ContractWorkflow"("contractId");

-- AddForeignKey
ALTER TABLE "ContractWorkflow" ADD CONSTRAINT "ContractWorkflow_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "WorkflowStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowTransition" ADD CONSTRAINT "WorkflowTransition_contractWorkflowId_fkey" FOREIGN KEY ("contractWorkflowId") REFERENCES "ContractWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
