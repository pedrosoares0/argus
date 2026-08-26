# 🩺 Argus — Prontidão Operacional do Centro Cirúrgico

Plataforma web mobile-first para gestão de prontidão cirúrgica, checklists de equipamentos, roteamento de não conformidades (NCs) e governança operacional hospitalar.

---

## 📚 Documentação Completa ("A Bíblia do Argus")

Toda a documentação técnica, modelo de dados, fluxos de permissões, arquitetura, design system e convenções de código estão centralizados em:

👉 **[`docs/ARGUS_BIBLE.md`](./docs/ARGUS_BIBLE.md)**

---

## 🚀 Tecnologias

- **Framework**: Next.js 16 (App Router)
- **Interface**: React 19, Tailwind CSS 4, Motion
- **Backend & Auth**: Supabase (PostgreSQL + SSR + Storage)
- **Tipagem**: TypeScript 5
- **E-mails**: Nodemailer (SMTP)
- **QR Code**: qrcode.react & BarcodeDetector API

---

## 🛠️ Como Rodar Localmente

### 1. Pré-requisitos
- Node.js 20+
- Conta e projeto configurados no [Supabase](https://supabase.com)

### 2. Instalação
```bash
npm install
```

### 3. Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz com as chaves:
```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_supabase
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email
SMTP_PASS=sua_senha_de_app
SMTP_FROM="Argus <alertas@argusclinica.com.br>"
```

### 4. Executar em Desenvolvimento
```bash
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000).

---

## 👥 Perfis e Credenciais de Teste

| Perfil | E-mail | Senha | Rota |
|---|---|---|---|
| **Inspetor** | `inspetor@gmail.com` | `123456` | `/inspetor` |
| **Engenharia Clínica** | `engenharia@gmail.com` | `123456` | `/engenharia` |
| **Coordenador** | `coordenador@gmail.com` | `123456` | `/coordenador` |
