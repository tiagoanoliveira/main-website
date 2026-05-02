# Formulário de Suporte — Guia de Integração (Embed)

O formulário de suporte pode ser integrado em qualquer site através de um `<iframe>`.
Suporta parâmetros de URL para controlar o tema e o fundo, permitindo adaptar a aparência ao site onde é incorporado.

---

## Parâmetros disponíveis

| Parâmetro | Valores aceites | Padrão | Descrição |
|-----------|----------------|--------|-----------|
| `theme`   | `light` \| `dark` \| `system` | `system` | Tema de cor: claro, escuro, ou segue o dispositivo |
| `bg`      | `true` \| `false` | `true` | Mostra (`true`) ou esconde (`false`) o background do formulário |

---

## Código embed — HTML puro

```html
<!-- Formulário de Suporte -->
<iframe
  id="support-form"
  src="https://tiagoanoliveira.com/support/TOKEN?theme=system&bg=true"
  style="width: 100%; border: none; overflow: hidden; display: block;"
  scrolling="no"
  title="Formulário de Suporte"
></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'supportFormHeight') {
      var iframe = document.getElementById('support-form');
      if (iframe) iframe.style.height = e.data.height + 'px';
    }
  });
</script>
```

---

## Código embed — React / TypeScript

```tsx
import { useEffect, useRef } from 'react';

type SupportFormTheme = 'light' | 'dark' | 'system';

interface SupportFormProps {
  token: string;
  theme?: SupportFormTheme;
  bg?: boolean;
  baseUrl?: string;
}

export function SupportForm({
  token,
  theme = 'system',
  bg = true,
  baseUrl = 'https://tiagoanoliveira.com',
}: SupportFormProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === 'supportFormHeight' && iframeRef.current) {
        iframeRef.current.style.height = `${e.data.height as number}px`;
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const params = new URLSearchParams({
    theme,
    bg: String(bg),
  });

  return (
    <iframe
      ref={iframeRef}
      src={`${baseUrl}/support/${token}?${params.toString()}`}
      style={{
        width: '100%',
        border: 'none',
        overflow: 'hidden',
        display: 'block',
      }}
      scrolling="no"
      title="Formulário de Suporte"
    />
  );
}
```

**Exemplo de uso:**

```tsx
// Tema escuro, sem fundo
<SupportForm token="abc123" theme="dark" bg={false} />

// Tema claro, com fundo
<SupportForm token="abc123" theme="light" bg={true} />

// Segue o dispositivo, sem fundo (ideal para integração em sites externos)
<SupportForm token="abc123" theme="system" bg={false} />
```

---

## Como funciona o redimensionamento automático

O formulário envia mensagens `postMessage` ao pai sempre que a sua altura muda:

```ts
// Mensagem enviada pelo iframe
{ type: 'supportFormHeight', height: number }
```

O script no site pai ouve essas mensagens e ajusta a altura do `<iframe>` automaticamente, evitando barras de scroll internas.
