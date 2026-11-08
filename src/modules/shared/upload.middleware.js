import multer from 'multer';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return callback(new Error('Formato não permitido. Use JPEG, PNG ou WebP'));
    }
    callback(null, true);
  }
});

// Executa o multer e converte os erros dele em respostas HTTP
export function uploadImage(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Imagem maior que 5 MB' });
      }
      return res.status(400).json({ error: 'Erro no envio do arquivo' });
    }

    return res.status(400).json({ error: error.message });
  });
}