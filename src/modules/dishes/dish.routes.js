import { Router } from 'express';
import { verifyJWT } from '../../middlewares/authMiddleware.js';
import { uploadImage } from '../shared/upload.middleware.js';
import * as dishController from './dish.controller.js';

const router = Router();

// Público: qualquer pessoa pode ver o cardápio
router.get('/restaurants/:restaurantId/dishes', dishController.list);

// Protegido: logado (verifyJWT) e dono do restaurante (checado no service)
router.post(
  '/restaurants/:restaurantId/dishes',
  verifyJWT,
  dishController.create
);

// Protegido: a ordem dos middlewares importa
router.post(
  '/dishes/:dishId/image',
  verifyJWT,                  // 1. está logado?
  dishController.ensureOwner, // 2. é o dono do prato?
  uploadImage,                // 3. recebe o arquivo (multer)
  dishController.uploadImage  // 4. otimiza (Sharp) e salva no banco
);

// Protegido: logado e dono do restaurante do prato (checado no service)
router.delete('/dishes/:dishId', verifyJWT, dishController.remove);

export default router;