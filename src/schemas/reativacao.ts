import { z } from "zod";

export const reativacaoSchema = z.object({
  filtro: z.enum([
    "Lista de reativação - Topo de funil - NO SHOW",
    "Lista de reativação - Topo de funil",
    "Lista de reativação - Fundo de funil",
  ]),
  proprietario: z.enum([
    "Andressa",
    "Camila Ataliba",
    "Lô-Ruama Oliveira",
    "Mariana",
    "William Martins",
  ]),
  cadencia: z.enum([
    "Reativação - Sem Retorno",
    // (deixe aberto para futuras cadências; por ora, esta é a default)
  ]).default("Reativação - Sem Retorno"),
  numero_negocio: z.number().int().min(1).max(1000).default(20), // quantidade de leads/negócios
});

export type ReativacaoPayload = z.infer<typeof reativacaoSchema>;
