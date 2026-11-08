import prisma from '../../lib/prisma.js';
import { optimizeImage, removeImage } from '../shared/image.service.js';

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseId(value, label) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw httpError(400, `${label} inválido`);
  }
  return id;
}

function validateDish({ name, description, price } = {}) {
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanDescription = typeof description === 'string' ? description.trim() : '';
  const validPriceType = typeof price === 'number' || typeof price === 'string';
  const cleanPrice = validPriceType ? Number(price) : NaN;

  if (!cleanName || cleanName.length > 100) {
    throw httpError(400, 'Nome é obrigatório (máx. 100 caracteres)');
  }
  if (!cleanDescription || cleanDescription.length > 500) {
    throw httpError(400, 'Descrição é obrigatória (máx. 500 caracteres)');
  }
  if (!Number.isFinite(cleanPrice) || cleanPrice <= 0 || cleanPrice > 99999999.99) {
    throw httpError(400, 'Preço deve ser um número maior que zero');
  }

  return {
    name: cleanName,
    description: cleanDescription,
    price: cleanPrice.toFixed(2)
  };
}

// Autorização: só o dono do restaurante pode alterar o cardápio
async function getOwnedRestaurant(restaurantId, userId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: parseId(restaurantId, 'Restaurante') }
  });

  if (!restaurant) {
    throw httpError(404, 'Restaurante não encontrado');
  }
  if (restaurant.ownerId !== Number(userId)) {
    throw httpError(403, 'Você não tem permissão para alterar este restaurante');
  }
  return restaurant;
}

export async function getOwnedDish(dishId, userId) {
  const dish = await prisma.dish.findUnique({
    where: { id: parseId(dishId, 'Prato') },
    include: { restaurant: { select: { ownerId: true } } }
  });

  if (!dish) {
    throw httpError(404, 'Prato não encontrado');
  }
  if (dish.restaurant.ownerId !== Number(userId)) {
    throw httpError(403, 'Você não tem permissão para alterar este prato');
  }
  return dish;
}

export async function createDish(restaurantId, userId, data) {
  const clean = validateDish(data);
  const restaurant = await getOwnedRestaurant(restaurantId, userId);

  return prisma.dish.create({
    data: { ...clean, restaurantId: restaurant.id }
  });
}

export async function listDishes(restaurantId) {
  return prisma.dish.findMany({
    where: { restaurantId: parseId(restaurantId, 'Restaurante') },
    orderBy: { id: 'asc' }
  });
}

export async function uploadDishImage(dishId, userId, buffer) {
  const dish = await getOwnedDish(dishId, userId);
  const imageUrl = await optimizeImage(buffer);

  try {
    const updated = await prisma.dish.update({
      where: { id: dish.id },
      data: { imageUrl }
    });

    if (dish.imageUrl) await removeImage(dish.imageUrl);
    return updated;
  } catch (error) {
    await removeImage(imageUrl);
    throw error;
  }
}

export async function deleteDish(dishId, userId) {
  const dish = await getOwnedDish(dishId, userId);

  // 1. Operação principal
  await prisma.dish.delete({ where: { id: dish.id } });

  // 2. Ação secundária: apagar a foto (nunca lança erro)
  if (dish.imageUrl) await removeImage(dish.imageUrl);
}