import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/api.ts';
import { getDb } from './src/server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production' && !process.env.DEFAULT_APP_PORT;
  const PORT = isProduction ? (Number(process.env.PORT) || 8080) : 3000;

  // Endpoint de santé pour les sondes Cloud Run et Kubernetes
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Middlewares fondamentaux
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Initialisation de la base de données
  await getDb();

  // Montage des routes d'API
  app.use('/api', apiRouter);

  // Intégration Vite (dev) ou fichiers statiques (production)
  if (!isProduction) {
    const fs = await import('fs');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FAITH SCHOOL MANAGER actif sur http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'développement'})`);
  });
}

startServer().catch((err) => {
  console.error('Erreur fatale au lancement du serveur:', err);
  process.exit(1);
});
