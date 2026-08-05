'use client'

import type { NaoConformidade, StatusNaoConformidade, CriticidadeItem, StatusAtivo } from './types'

export interface HistoricoStatusNaoConformidade {
  id: string
  nao_conformidade_id: string
  status_anterior: StatusNaoConformidade | null
  status_novo: StatusNaoConformidade
  usuario_id: string
  usuario_nome: string
  created_at: string
  justificativa?: string
}

export interface RegistroManutencao {
  id: string
  nao_conformidade_id: string
  ativo_id: string
  descricao: string
  status: 'em_andamento' | 'finalizada'
  finalizada_em: string | null
  created_at: string
}

export interface MockAtivo {
  id: string
  nome: string
  categoria: string
  status: StatusAtivo
  codigo_qr: string
}

export interface MockLocal {
  id: string
  nome: string
  centro_cirurgico: string
  unidade: string
  hospital: string
}

export interface MockItemExecucao {
  id: string
  resposta: string
  evidencia_url: string | null
  evidencia_texto: string | null
  item_congelado: string
}

export interface MockNaoConformidadeExtended extends NaoConformidade {
  numero_unico: string
  ativo: MockAtivo | null
  local: MockLocal
  item_execucao: MockItemExecucao
  historico: HistoricoStatusNaoConformidade[]
  registro_manutencao: RegistroManutencao | null
  criado_por_nome: string
  responsavel_nome: string | null
}

const INITIAL_LOCALS: Record<string, MockLocal> = {
  'loc-001': { id: 'loc-001', nome: 'Sala 01', centro_cirurgico: 'Centro Cirúrgico A', unidade: 'Unidade de Internação', hospital: 'Hospital Sentry' },
  'loc-002': { id: 'loc-002', nome: 'Sala 02', centro_cirurgico: 'Centro Cirúrgico A', unidade: 'Unidade de Internação', hospital: 'Hospital Sentry' },
  'loc-003': { id: 'loc-003', nome: 'Sala 03', centro_cirurgico: 'Centro Cirúrgico A', unidade: 'Unidade de Internação', hospital: 'Hospital Sentry' },
  'loc-004': { id: 'loc-004', nome: 'Sala 04', centro_cirurgico: 'Centro Cirúrgico A', unidade: 'Unidade de Internação', hospital: 'Hospital Sentry' },
  'loc-uti': { id: 'loc-uti', nome: 'Leito 05 (UTI-A)', centro_cirurgico: 'Bloco A (UTI Adulto)', unidade: 'Unidade de Terapia Intensiva', hospital: 'Hospital Sentry' }
}

const INITIAL_ATIVOS: Record<string, MockAtivo> = {
  'at-001': { id: 'at-001', nome: 'Mesa Cirúrgica Hidráulica #1', categoria: 'Mesa cirúrgica', status: 'indisponivel', codigo_qr: 'QR-MESA-001' },
  'at-002': { id: 'at-002', nome: 'Monitor Multiparamétrico DX8', categoria: 'Monitor multiparamétrico', status: 'operacional_com_restricoes', codigo_qr: 'QR-MON-002' },
  'at-003': { id: 'at-003', nome: 'Carrinho de Parada #1', categoria: 'Carrinho de parada', status: 'em_manutencao', codigo_qr: 'QR-CARRINHO-003' },
  'at-004': { id: 'at-004', nome: 'Aparelho de Anestesia Flow-i', categoria: 'Aparelho de anestesia', status: 'operacional', codigo_qr: 'QR-ANES-004' },
  'at-005': { id: 'at-005', nome: 'Bomba de Infusão Alaris', categoria: 'Bomba de infusão', status: 'indisponivel', codigo_qr: 'QR-BOMBA-005' }
}

const INITIAL_NC_EXTENDED: MockNaoConformidadeExtended[] = [
  {
    id: 'nc-1',
    numero_unico: 'NC-2026-001',
    hospital_id: 'hosp-sentry',
    item_execucao_id: 'item-ex-1',
    ativo_id: 'at-001',
    local_id: 'loc-001',
    descricao: 'Trilho lateral esquerdo solto e com parafusos espanados, impedindo a fixação segura de apoios de braço.',
    criticidade: 'critico',
    status: 'aberta',
    responsavel_id: null,
    responsavel_nome: null,
    prazo: new Date(Date.now() + 4 * 3600 * 1000).toISOString(), // 4 horas
    evidencia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // Aberta há 2h
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ativo: INITIAL_ATIVOS['at-001'],
    local: INITIAL_LOCALS['loc-001'],
    item_execucao: {
      id: 'item-ex-1',
      resposta: 'nao_conforme',
      evidencia_url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
      evidencia_texto: 'Trilho quebrado no lado esquerdo superior.',
      item_congelado: 'Estrutura e Trilhos Laterais'
    },
    historico: [
      {
        id: 'hist-1-1',
        nao_conformidade_id: 'nc-1',
        status_anterior: null,
        status_novo: 'aberta',
        usuario_id: 'usr-insp-1',
        usuario_nome: 'Enf. Pedro Soares',
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      }
    ],
    registro_manutencao: null,
    criado_por_nome: 'Enf. Pedro Soares'
  },
  {
    id: 'nc-2',
    numero_unico: 'NC-2026-002',
    hospital_id: 'hosp-sentry',
    item_execucao_id: 'item-ex-2',
    ativo_id: 'at-002',
    local_id: 'loc-002',
    descricao: 'Bateria interna não segura carga por mais de 5 minutos durante simulação de queda de energia.',
    criticidade: 'importante',
    status: 'em_analise',
    responsavel_id: 'usr-eng-1',
    responsavel_nome: 'Eng. Carlos Eduardo',
    prazo: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), // 24 horas
    evidencia_url: null,
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), // Aberta há 5h
    updated_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    ativo: INITIAL_ATIVOS['at-002'],
    local: INITIAL_LOCALS['loc-002'],
    item_execucao: {
      id: 'item-ex-2',
      resposta: 'nao_conforme',
      evidencia_url: null,
      evidencia_texto: 'Alerta visual de bateria fraca constante mesmo conectado à rede.',
      item_congelado: 'Bateria e Alimentação'
    },
    historico: [
      {
        id: 'hist-2-1',
        nao_conformidade_id: 'nc-2',
        status_anterior: null,
        status_novo: 'aberta',
        usuario_id: 'usr-insp-2',
        usuario_nome: 'Enf. Cláudia Rodrigues',
        created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-2-2',
        nao_conformidade_id: 'nc-2',
        status_anterior: 'aberta',
        status_novo: 'em_analise',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      }
    ],
    registro_manutencao: null,
    criado_por_nome: 'Enf. Cláudia Rodrigues'
  },
  {
    id: 'nc-3',
    numero_unico: 'NC-2026-003',
    hospital_id: 'hosp-sentry',
    item_execucao_id: 'item-ex-3',
    ativo_id: 'at-003',
    local_id: 'loc-uti',
    descricao: 'Lâmina curva nº 4 do laringoscópio quebrada (encaixe da lâmpada trincado, não acende).',
    criticidade: 'critico',
    status: 'em_correcao',
    responsavel_id: 'usr-eng-1',
    responsavel_nome: 'Eng. Carlos Eduardo',
    prazo: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), // 2 horas
    evidencia_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600',
    created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString(), // Aberta há 10h
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    ativo: INITIAL_ATIVOS['at-003'],
    local: INITIAL_LOCALS['loc-uti'],
    item_execucao: {
      id: 'item-ex-3',
      resposta: 'nao_conforme',
      evidencia_url: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600',
      evidencia_texto: 'Lâmpada do laringoscópio não liga de jeito nenhum, lâmina nº 4 danificada no encaixe.',
      item_congelado: 'Laringoscópio'
    },
    historico: [
      {
        id: 'hist-3-1',
        nao_conformidade_id: 'nc-3',
        status_anterior: null,
        status_novo: 'aberta',
        usuario_id: 'usr-insp-3',
        usuario_nome: 'Enf. Mariana Silva',
        created_at: new Date(Date.now() - 10 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-3-2',
        nao_conformidade_id: 'nc-3',
        status_anterior: 'aberta',
        status_novo: 'em_analise',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-3-3',
        nao_conformidade_id: 'nc-3',
        status_anterior: 'em_analise',
        status_novo: 'em_correcao',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      }
    ],
    registro_manutencao: {
      id: 'reg-3',
      nao_conformidade_id: 'nc-3',
      ativo_id: 'at-003',
      descricao: 'Constatado defeito físico no encaixe da lâmina e lâmpada queimada. Solicitada peça de reposição no almoxarifado técnico.',
      status: 'em_andamento',
      finalizada_em: null,
      created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    criado_por_nome: 'Enf. Mariana Silva'
  },
  {
    id: 'nc-4',
    numero_unico: 'NC-2026-004',
    hospital_id: 'hosp-sentry',
    item_execucao_id: 'item-ex-4',
    ativo_id: 'at-004',
    local_id: 'loc-003',
    descricao: 'Cabo de alimentação elétrica do ventilador ressecado e com pequena exposição da malha metálica.',
    criticidade: 'informativo',
    status: 'aguardando_validacao',
    responsavel_id: 'usr-eng-1',
    responsavel_nome: 'Eng. Carlos Eduardo',
    prazo: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    evidencia_url: null,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ativo: INITIAL_ATIVOS['at-004'],
    local: INITIAL_LOCALS['loc-003'],
    item_execucao: {
      id: 'item-ex-4',
      resposta: 'nao_conforme',
      evidencia_url: null,
      evidencia_texto: 'Fio desgastado próximo à tomada.',
      item_congelado: 'Conexões Elétricas'
    },
    historico: [
      {
        id: 'hist-4-1',
        nao_conformidade_id: 'nc-4',
        status_anterior: null,
        status_novo: 'aberta',
        usuario_id: 'usr-insp-4',
        usuario_nome: 'Enf. Bruno Costa',
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-4-2',
        nao_conformidade_id: 'nc-4',
        status_anterior: 'aberta',
        status_novo: 'em_analise',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 20 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-4-3',
        nao_conformidade_id: 'nc-4',
        status_anterior: 'em_analise',
        status_novo: 'em_correcao',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
      },
      {
        id: 'hist-4-4',
        nao_conformidade_id: 'nc-4',
        status_anterior: 'em_correcao',
        status_novo: 'aguardando_validacao',
        usuario_id: 'usr-eng-1',
        usuario_nome: 'Eng. Carlos Eduardo',
        created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
      }
    ],
    registro_manutencao: {
      id: 'reg-4',
      nao_conformidade_id: 'nc-4',
      ativo_id: 'at-004',
      descricao: 'Realizada substituição preventiva completa do cabo de força e feito teste de corrente de fuga. Equipamento liberado e operacional.',
      status: 'finalizada',
      finalizada_em: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString()
    },
    criado_por_nome: 'Enf. Bruno Costa'
  },
  {
    id: 'nc-5',
    numero_unico: 'NC-2026-005',
    hospital_id: 'hosp-sentry',
    item_execucao_id: 'item-ex-5',
    ativo_id: 'at-005',
    local_id: 'loc-004',
    descricao: 'Erro de calibração E-04 recorrente ao iniciar a infusão em taxas acima de 100 ml/h.',
    criticidade: 'importante',
    status: 'aberta',
    responsavel_id: null,
    responsavel_nome: null,
    prazo: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    evidencia_url: null,
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    ativo: INITIAL_ATIVOS['at-005'],
    local: INITIAL_LOCALS['loc-004'],
    item_execucao: {
      id: 'item-ex-5',
      resposta: 'nao_conforme',
      evidencia_url: null,
      evidencia_texto: 'Aparece código de erro E-04 na tela de inicialização.',
      item_congelado: 'Interface e Calibração'
    },
    historico: [
      {
        id: 'hist-5-1',
        nao_conformidade_id: 'nc-5',
        status_anterior: null,
        status_novo: 'aberta',
        usuario_id: 'usr-insp-2',
        usuario_nome: 'Enf. Cláudia Rodrigues',
        created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString()
      }
    ],
    registro_manutencao: null,
    criado_por_nome: 'Enf. Cláudia Rodrigues'
  }
]

const STORE_KEY = 'sentry_mock_db_extended'
const USER_KEY = 'sentry_usuario_atual'

export const DEFAULT_USER = {
  id: 'usr-eng-1',
  nome: 'Eng. Carlos Eduardo',
  perfil: 'engenharia_clinica' as const
}

// Inicializa no cliente
function getStore(): MockNaoConformidadeExtended[] {
  if (typeof window === 'undefined') return INITIAL_NC_EXTENDED
  const store = window.localStorage.getItem(STORE_KEY)
  if (!store) {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_NC_EXTENDED))
    return INITIAL_NC_EXTENDED
  }
  return JSON.parse(store)
}

function saveStore(data: MockNaoConformidadeExtended[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORE_KEY, JSON.stringify(data))
}

export function getUsuarioLogado() {
  if (typeof window === 'undefined') return DEFAULT_USER
  const user = window.localStorage.getItem(USER_KEY)
  if (!user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER))
    return DEFAULT_USER
  }
  return JSON.parse(user)
}

export function resetMockDb() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORE_KEY, JSON.stringify(INITIAL_NC_EXTENDED))
  window.localStorage.setItem(USER_KEY, JSON.stringify(DEFAULT_USER))
}

export function getNCs(): MockNaoConformidadeExtended[] {
  return getStore()
}

export function getNC(id: string): MockNaoConformidadeExtended | null {
  const store = getStore()
  return store.find((nc) => nc.id === id) || null
}

export function assumirNC(ncId: string, usuarioId: string, usuarioNome: string): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  nc.responsavel_id = usuarioId
  nc.responsavel_nome = usuarioNome
  nc.updated_at = new Date().toISOString()

  // Adiciona histórico
  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: nc.status,
    status_novo: nc.status, // o status não mudou, apenas o responsável
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString()
  })

  saveStore(store)
  return nc
}

export function iniciarAnalise(ncId: string, usuarioId: string, usuarioNome: string): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  const statusAnterior = nc.status
  nc.status = 'em_analise'
  nc.updated_at = new Date().toISOString()

  // Garante que é o responsável
  nc.responsavel_id = usuarioId
  nc.responsavel_nome = usuarioNome

  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: statusAnterior,
    status_novo: 'em_analise',
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString()
  })

  saveStore(store)
  return nc
}

export function registrarCorrecao(
  ncId: string,
  usuarioId: string,
  usuarioNome: string,
  descricaoReparo: string
): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  const statusAnterior = nc.status
  nc.status = 'em_correcao'
  nc.updated_at = new Date().toISOString()

  // Atualiza status do ativo para "em_manutencao"
  if (nc.ativo) {
    nc.ativo.status = 'em_manutencao'
  }

  // Cria registro de manutenção
  nc.registro_manutencao = {
    id: `reg-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    ativo_id: nc.ativo_id || 'at-unknown',
    descricao: descricaoReparo,
    status: 'em_andamento',
    finalizada_em: null,
    created_at: new Date().toISOString()
  }

  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: statusAnterior,
    status_novo: 'em_correcao',
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString()
  })

  saveStore(store)
  return nc
}

export function finalizarReparo(ncId: string, usuarioId: string, usuarioNome: string): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  const statusAnterior = nc.status
  nc.status = 'aguardando_validacao'
  nc.updated_at = new Date().toISOString()

  // Finaliza registro de manutenção
  if (nc.registro_manutencao) {
    nc.registro_manutencao.status = 'finalizada'
    nc.registro_manutencao.finalizada_em = new Date().toISOString()
  }

  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: statusAnterior,
    status_novo: 'aguardando_validacao',
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString()
  })

  saveStore(store)
  return nc
}

export function validarCorrecao(ncId: string, usuarioId: string, usuarioNome: string): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  const statusAnterior = nc.status
  nc.status = 'encerrada'
  nc.updated_at = new Date().toISOString()

  // Se houver um ativo, atualiza o status dele para operacional
  if (nc.ativo) {
    nc.ativo.status = 'operacional'
  }

  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: statusAnterior,
    status_novo: 'encerrada',
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString()
  })

  saveStore(store)
  return nc
}

export function reabrirNC(
  ncId: string,
  usuarioId: string,
  usuarioNome: string,
  justificativa: string
): MockNaoConformidadeExtended | null {
  const store = getStore()
  const idx = store.findIndex((nc) => nc.id === ncId)
  if (idx === -1) return null

  const nc = store[idx]
  const statusAnterior = nc.status
  nc.status = 'em_correcao'
  nc.updated_at = new Date().toISOString()

  // Se houver um ativo, atualiza o status dele para em_manutencao
  if (nc.ativo) {
    nc.ativo.status = 'em_manutencao'
  }

  // Se houver registro de manutenção, reativa ele para em_andamento
  if (nc.registro_manutencao) {
    nc.registro_manutencao.status = 'em_andamento'
    nc.registro_manutencao.finalizada_em = null
  }

  nc.historico.push({
    id: `hist-${nc.id}-${Date.now()}`,
    nao_conformidade_id: ncId,
    status_anterior: statusAnterior,
    status_novo: 'em_correcao',
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    created_at: new Date().toISOString(),
    justificativa: justificativa
  })

  saveStore(store)
  return nc
}
