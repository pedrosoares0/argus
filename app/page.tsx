import { redirect } from 'next/navigation'

/**
 * Página raiz — redireciona para login.
 * Futuramente: verificar sessão e redirecionar para dashboard do perfil.
 */
export default function PaginaRaiz() {
  redirect('/login')
}
