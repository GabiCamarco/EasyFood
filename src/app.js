import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './modules/auth/auth.routes.js';
import restaurantRoutes from './modules/restaurants/restaurantRoutes.js';
import dishRoutes from './modules/dishes/dish.routes.js';
import { UPLOADS_DIR } from './modules/shared/image.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Imagens otimizadas dos pratos (públicas)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '7d', immutable: true }));

app.use('/auth', authRoutes);
app.use(restaurantRoutes);
app.use(dishRoutes);

// Tratador global de erros: precisa ser o ÚLTIMO app.use
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição grande demais' });
  }
  console.error('Erro não tratado:', err.message);
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;