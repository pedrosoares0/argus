/**
 * Utilitário de tratamento e tradução de erros de autenticação e banco de dados (Supabase / Argus).
 * Garante que NUNCA apareça "{}" ou mensagens técnicas em inglês para o usuário final.
 */

export function traduzirErroAuth(erro: any): string {
  if (!erro) return 'Ocorreu um erro inesperado. Tente novamente.'

  // Se for um erro do tipo AuthRetryableFetchError ou status 500 com mensagem vazia/{}
  if (
    erro?.name === 'AuthRetryableFetchError' ||
    erro?.__isAuthError && erro?.status === 500 ||
    erro?.message === '{}' ||
    erro === '{}'
  ) {
    return 'Erro temporário de comunicação com o banco de dados ao salvar o usuário. Tente novamente em instantes.'
  }

  // Se for um objeto vazio sem propriedades úteis
  if (typeof erro === 'object' && Object.keys(erro).length === 0 && !erro.message && !erro.error_description) {
    return 'Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente.'
  }

  // Se já for uma string direta
  let mensagem = ''
  if (typeof erro === 'string') {
    mensagem = erro
  } else if (erro.message && typeof erro.message === 'string') {
    mensagem = erro.message
  } else if (erro.error_description && typeof erro.error_description === 'string') {
    mensagem = erro.error_description
  } else if (erro.msg && typeof erro.msg === 'string') {
    mensagem = erro.msg
  } else if (erro.details && typeof erro.details === 'string') {
    mensagem = erro.details
  } else if (erro.data?.message && typeof erro.data.message === 'string') {
    mensagem = erro.data.message
  } else {
    // Tenta obter string útil sem cair em "{}"
    try {
      const s = JSON.stringify(erro)
      if (s && s !== '{}') {
        mensagem = s
      }
    } catch {
      // Ignora erro de serialização
    }

    if (!mensagem || mensagem === '{}') {
      mensagem = erro.toString && erro.toString() !== '[object Object]' 
        ? erro.toString() 
        : 'Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente.'
    }
  }

  // Se mesmo após tudo isso a mensagem for "{}"
  if (mensagem.trim() === '{}' || mensagem.trim() === '') {
    return 'Ocorreu um erro inesperado ao processar sua solicitação. Tente novamente.'
  }

  const msgMin = mensagem.toLowerCase()

  // Dicionário de traduções e mensagens amigáveis
  if (msgMin.includes('user already registered') || msgMin.includes('already registered') || msgMin.includes('unique constraint') || msgMin.includes('email already in use')) {
    return 'Este e-mail já está cadastrado. Tente entrar com sua senha ou recuperar o acesso.'
  }

  if (msgMin.includes('invalid login credentials') || msgMin.includes('invalid credentials') || msgMin.includes('wrong password') || msgMin.includes('invalid password')) {
    return 'E-mail ou senha incorretos. Por favor, confira os dados digitados.'
  }

  if (msgMin.includes('password should be at least') || msgMin.includes('password is too short')) {
    return 'A senha é muito curta. Crie uma senha com pelo menos 6 caracteres.'
  }

  if (msgMin.includes('signup requires a valid password') || msgMin.includes('password cannot be empty')) {
    return 'Por favor, informe uma senha válida para criar sua conta.'
  }

  if (msgMin.includes('email not confirmed') || msgMin.includes('unconfirmed email')) {
    return 'Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada ou spam.'
  }

  if (msgMin.includes('rate limit') || msgMin.includes('over_email_send_rate_limit') || msgMin.includes('too many requests') || msgMin.includes('429')) {
    return 'Muitas tentativas em pouco tempo. Por segurança, aguarde alguns segundos antes de tentar novamente.'
  }

  if (msgMin.includes('database error saving new user') || msgMin.includes('unexpected_failure')) {
    return 'Erro no banco de dados ao registrar novo usuário. O trigger do Supabase requer atualização de colunas.'
  }

  if (msgMin.includes('failed to fetch') || msgMin.includes('networkerror') || msgMin.includes('network request failed') || msgMin.includes('connection refused')) {
    return 'Falha na conexão com o servidor. Verifique se você está conectado à internet.'
  }

  if (msgMin.includes('jwt') || msgMin.includes('token is expired') || msgMin.includes('session expired')) {
    return 'Sua sessão expirou. Por favor, faça login novamente.'
  }

  if (msgMin.includes('invalid email') || msgMin.includes('email address is invalid') || msgMin.includes('unable to validate email address')) {
    return 'O formato do e-mail digitado é inválido. Digite um e-mail válido (ex: nome@hospital.com).'
  }

  if (msgMin.includes('foreign key constraint') || msgMin.includes('hospital_id')) {
    return 'Hospital selecionado inválido ou não encontrado. Tente selecionar outro hospital.'
  }

  if (msgMin.includes('database error') || msgMin.includes('internal server error') || msgMin.includes('500')) {
    return 'O servidor encontrou uma instabilidade temporária. Tente novamente em instantes.'
  }

  // Retorna a mensagem limpa se não couber nas regras acima
  return mensagem.length > 120 ? mensagem.slice(0, 120) + '...' : mensagem
}
