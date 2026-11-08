import { Router } from 'express';
import { getRestaurants, postRestaurant, deleteRestaurantById } from './restaurantControler.js';
import { verifyJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

// Rota pública: Qualquer um pode listar os restaurantes
router.get('/restaurants', getRestaurants);

// Rota protegida: Apenas usuários autenticados (com token JWT válido) podem cadastrar
router.post('/restaurants', verifyJWT, postRestaurant);

// Rota protegida: apenas o dono do restaurante pode excluí-lo
router.delete('/restaurants/:id', verifyJWT, deleteRestaurantById);

export default router;