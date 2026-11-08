import { registerUser, loginUser, confirmUserEmail } from './auth.service.js';
import { escapeHtml } from '../shared/email.service.js';

function page(title, message) {
  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 80px auto; text-align: center;">
  <h2>${title}</h2>
  <p>${message}</p>
  <a href="/">Ir para a EasyFood</a>
</body>
</html>`;
}

export async function register(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  try {
    const user = await registerUser({ name, email, password });
    return res.status(201).json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
  }

  try {
    const result = await loginUser({ email, password });
    if (!result) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export async function confirmEmail(req, res) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send(page('Link inválido', 'O link está incompleto.'));
  }

  try {
    const user = await confirmUserEmail(token);

    if (!user) {
      return res
        .status(400)
        .send(page('Link inválido ou expirado', 'Faça um novo cadastro para receber outro link.'));
    }

    return res.send(
      page('E-mail confirmado!', `Obrigado, ${escapeHtml(user.name)}. Sua conta está ativa.`)
    );
  } catch (error) {
    console.error('Erro ao confirmar e-mail:', error.message);
    return res.status(500).send(page('Erro', 'Tente novamente mais tarde.'));
  }
}
