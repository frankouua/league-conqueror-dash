

# Plano de Correção: Login Travado na Página de Autenticação

## Diagnóstico

O problema identificado é uma **combinação de 3 falhas** que causam o travamento do login:

1. **Token corrompido no navegador**: O SDK do Supabase tenta renovar um refresh token antigo/inválido guardado no localStorage
2. **Erro de rede não tratado**: A chamada de refresh falha com "Failed to fetch" e não há tratamento adequado
3. **Estado `isLoading` não resetado**: O botão fica preso em "Entrando..." porque o `finally` block não é executado quando a Promise fica pendente

## Solução Proposta

### 1. Limpar sessão corrompida no AuthContext (Prioridade Crítica)

Modificar `src/contexts/AuthContext.tsx` para:

```text
- Adicionar tratamento de erro no getSession()
- Limpar localStorage quando detectar sessão corrompida
- Garantir que isLoading seja sempre resetado
```

**Mudanças específicas:**
- Adicionar `try/catch` ao redor de `getSession()`
- Limpar storage em caso de erro de autenticação
- Chamar `supabase.auth.signOut()` para limpar estado corrompido

### 2. Adicionar timeout no handleSubmit da Auth.tsx (Segurança)

Modificar `src/pages/Auth.tsx` para:

```text
- Adicionar timeout de 10 segundos para a operação de login
- Se exceder o timeout, resetar isLoading e mostrar mensagem de erro
- Tratar erros de rede especificamente
```

**Mudanças específicas:**
- Envolver o `signIn()` com `Promise.race()` + timeout
- Garantir que `setIsLoading(false)` seja chamado em todos os cenários

### 3. Botão de "Limpar e Tentar Novamente" (UX)

Adicionar na página Auth um link/botão que:

```text
- Detecta quando há problema de autenticação persistente
- Oferece opção de limpar dados de sessão e tentar novamente
- Chama supabase.auth.signOut() para limpar tudo
```

---

## Detalhes Técnicos

### Arquivo: `src/contexts/AuthContext.tsx`

**Antes (linhas 115-126):**
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  window.clearTimeout(loadingFailsafeId);
  setSession(session);
  setUser(session?.user ?? null);
  
  if (session?.user) {
    fetchUserData(session.user.id);
  }
  
  setIsLoading(false);
});
```

**Depois:**
```typescript
supabase.auth.getSession().then(({ data: { session } }) => {
  // ... código existente
}).catch(async (error) => {
  console.warn("Erro ao recuperar sessão, limpando dados corrompidos:", error);
  // Limpar sessão corrompida
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Ignorar erro de signOut
  }
  setSession(null);
  setUser(null);
  setIsLoading(false);
});
```

### Arquivo: `src/pages/Auth.tsx`

**Adicionar função de timeout:**
```typescript
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error("Tempo esgotado")), ms)
    )
  ]);
};
```

**Modificar handleSubmit (linha ~181):**
```typescript
const { error } = await withTimeout(
  signIn(formData.email, formData.password),
  10000 // 10 segundos timeout
);
```

**Adicionar tratamento de erro de rede:**
```typescript
} catch (err: any) {
  if (err?.message?.includes("Failed to fetch") || err?.message === "Tempo esgotado") {
    // Limpar sessão corrompida
    await supabase.auth.signOut();
    toast({
      title: "Erro de conexão",
      description: "Por favor, recarregue a página e tente novamente.",
      variant: "destructive",
    });
  } else {
    toast({
      title: "Erro",
      description: "Algo deu errado. Tente novamente.",
      variant: "destructive",
    });
  }
} finally {
  setIsLoading(false);
}
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `src/contexts/AuthContext.tsx` | Adicionar tratamento de erro e limpeza de sessão |
| `src/pages/Auth.tsx` | Adicionar timeout e tratamento de erro de rede |

## Benefícios

- **Imediato**: Login deixa de travar mesmo com sessão corrompida
- **Robusto**: Timeouts previnem estados indefinidos
- **Recuperável**: Erros limpam automaticamente dados corrompidos
- **UX**: Mensagens de erro claras orientam o usuário

## Ordem de Implementação

1. Primeiro corrigir `AuthContext.tsx` (resolve a causa raiz)
2. Depois corrigir `Auth.tsx` (adiciona camada extra de proteção)

