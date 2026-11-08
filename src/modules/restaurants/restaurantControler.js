import { findAllRestaurants, createRestaurant, deleteRestaurant } from './restaurantService.js';

export async function getRestaurants(req, res) {
    try {
        const restaurants = await findAllRestaurants();
        return res.json(restaurants);
    } catch (error) {
        console.error("Erro ao buscar restaurantes:", error.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
}

export async function postRestaurant(req, res) {
    const { name, category } = req.body;
    
    if (!name || !category) {
        return res.status(400).json({ erro: "Nome e categoria são obrigatórios" });
    }

    try {
        const novoRestaurante = await createRestaurant(req.body, req.user);
        return res.status(201).json(novoRestaurante);
    } catch (error) {
        console.error("Erro ao cadastrar restaurante:", error.message);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}

export async function deleteRestaurantById(req, res) {
    try {
        await deleteRestaurant(req.params.id, req.user.id);
        return res.status(204).send();
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error("Erro ao excluir restaurante:", error.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
}