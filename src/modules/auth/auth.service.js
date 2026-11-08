import prisma from '../../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { sendEmail, escapeHtml } from '../shared/email.service.js';

// O banco guarda apenas o hash do token; o token puro vai só no e-mail
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export async function registerUser({ name, email, password }) {
  const hash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString('hex');

  // 1. Operação principal
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hash,
      verifyToken: hashToken(token),
      verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    select: { id: true, name: true, email: true }
  });

  // 2. Ação secundária: falha no e-mail não cancela o cadastro
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  const link = `${baseUrl}/auth/confirm-email?token=${token}`;

  try {
    await sendEmail({
      to: user.email,
      toName: user.name,
      subject: 'Confirme seu e-mail na EasyFood',
      header: `Olá, ${escapeHtml(user.name)}!`,
      body: `
        Falta pouco para ativar sua conta na EasyFood.<br/><br/>
        <a href="${link}">Clique aqui para confirmar seu e-mail</a><br/><br/>
        Se o link não abrir, copie este endereço no navegador:<br/>
        ${link}<br/><br/>
        O link vale por 24 horas.
      `,
      footer: 'Se você não criou esta conta, ignore este e-mail.'
    });
  } catch (error) {
    console.error('Erro ao enviar e-mail de confirmação:', error.message);
  }

  // 3. Retorno da operação principal
  return user;
}

export async function confirmUserEmail(token) {
  const user = await prisma.user.findUnique({
    where: { verifyToken: hashToken(token) }
  });

  if (!user || !user.verifyTokenExp || user.verifyTokenExp < new Date()) {
    return null;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExp: null }
  });

  return { id: user.id, name: user.name };
}

export async function loginUser({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const senhaConfere = await bcrypt.compare(password, user.password);
  if (!senhaConfere) return null;

  const token = jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email }
  };
}
