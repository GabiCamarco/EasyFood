import * as dishService from './dish.service.js';

// Traduz o erro do service em resposta HTTP
function handleError(res, error, fallbackMessage) {
  if (error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(fallbackMessage, error.message);
  return res.status(500).json({ error: fallbackMessage });
}

export async function create(req, res) {
  try {
    const dish = await dishService.createDish(
      req.params.restaurantId,
      req.user.id,
      req.body ?? {}
    );
    return res.status(201).json(dish);
  } catch (error) {
    return handleError(res, error, 'Erro interno ao cadastrar prato');
  }
}

export async function list(req, res) {
  try {
    const dishes = await dishService.listDishes(req.params.restaurantId);
    return res.json(dishes);
  } catch (error) {
    return handleError(res, error, 'Erro ao consultar pratos');
  }
}

// Roda ANTES do multer: recusa quem não é dono sem carregar o arquivo na memória
export async function ensureOwner(req, res, next) {
  try {
    await dishService.getOwnedDish(req.params.dishId, req.user.id);
    return next();
  } catch (error) {
    return handleError(res, error, 'Erro ao verificar permissão');
  }
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    const dish = await dishService.uploadDishImage(
      req.params.dishId,
      req.user.id,
      req.file.buffer
    );
    return res.json(dish);
  } catch (error) {
    return handleError(res, error, 'Erro ao processar imagem');
  }
}

export async function remove(req, res) {
  try {
    await dishService.deleteDish(req.params.dishId, req.user.id);
    return res.status(204).send();
  } catch (error) {
    return handleError(res, error, 'Erro ao excluir prato');
  }
}