const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Escapa texto vindo de usuários antes de colocá-lo no HTML do e-mail
export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml({ header, body, footer }) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${header}</h2>
      <div>${body}</div>
      <hr />
      <p style="color: #888; font-size: 12px;">
        ${footer}
      </p>
    </div>
  `;
}

// Versão em texto puro (alternativa ao HTML, ajuda na entrega)
function toText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .trim();
}

// Única função que o resto da EasyFood conhece.
// Para trocar de provedor, altere apenas o fetch abaixo.
export async function sendEmail({ to, toName, subject, header, body, footer }) {
  const apiKey = process.env.EMAIL_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('EMAIL_API_KEY e EMAIL_FROM precisam estar no .env');
  }

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || 'EasyFood', email: from },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: buildHtml({ header, body, footer }),
      textContent: toText(`${header}\n\n${body}\n\n${footer}`)
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Brevo respondeu ${response.status}: ${detail}`);
  }

  console.log(`[EMAIL] Enviado para ${to} - "${subject}"`);
}
