import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProcedureType, Service } from '@prisma/client';
import { FormSchema } from '../dossiers/form-validation';
import { PrismaService } from '../prisma/prisma.service';
import { ProcedureDetailDto, ProcedureQueryDto, ProcedureSummaryDto, ServiceDto } from './catalogue.dto';

type ProcedureWithService = ProcedureType & { service: Service };

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  async listServices(): Promise<ServiceDto[]> {
    return this.prisma.service.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true, email: true, phone: true, address: true, openingHours: true, domains: true },
    });
  }

  async listProcedures(q: ProcedureQueryDto): Promise<ProcedureSummaryDto[]> {
    const where: Prisma.ProcedureTypeWhereInput = { active: true, service: { active: true } };
    if (q.category) where.category = q.category;
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
      ];
    }
    const rows = await this.prisma.procedureType.findMany({
      where,
      include: { service: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toSummary);
  }

  async getProcedure(code: string): Promise<ProcedureDetailDto> {
    const p = await this.prisma.procedureType.findFirst({
      where: { code, active: true, service: { active: true } },
      include: { service: true },
    });
    if (!p) throw new NotFoundException('Démarche introuvable ou non disponible');
    return {
      ...toSummary(p),
      conditions: p.conditions,
      requiredDocs: (p.requiredDocs as string[] | null) ?? [],
      fields: (p.formSchema as FormSchema | null)?.fields ?? [],
      formVersion: p.formVersion,
    };
  }
}

function toSummary(p: ProcedureWithService): ProcedureSummaryDto {
  return {
    code: p.code,
    name: p.name,
    category: p.category,
    description: p.description,
    onlineMode: p.onlineMode,
    indicativeDays: p.indicativeDays,
    fee: p.fee?.toString() ?? null,
    service: { id: p.service.id, name: p.service.name },
  };
}
