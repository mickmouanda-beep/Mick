import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import apiRouter from './src/server/api.ts';
import { db } from './src/server/firestore_db.ts';

// 1. TRAPPES DE SÉCURITÉ GLOBALES
// Empêche tout crash inattendu du processus Node.js suite à des promesses rejetées ou erreurs asynchrones non capturées
process.on('uncaughtException', (err: Error) => {
  console.error('[CRITICAL] Uncaught exception interceptée (processus maintenu actif):', err?.message || err);
  if (err?.stack) console.error(err.stack);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[CRITICAL] Unhandled promise rejection interceptée (processus maintenu actif):', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';

  // 2. PORT ADAPTÉ POUR CLOUD RUN ET LOCAL
  // Cloud Run définit process.env.PORT (ex: 8080). En local, fallback sur 3000.
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // 3. Endpoint de santé pour les sondes Cloud Run et Kubernetes (prioritaire, placé au tout début)
  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'faith-school-manager'
    });
  });

  // Middlewares fondamentaux
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // 4. Initialisation sécurisée de Cloud Firestore
  try {
    console.log('[Eco GES] Connexion active Cloud Firestore prête (Base:', db ? 'Connectée' : 'Inaccessible', ').');
  } catch (fsErr) {
    console.error('[Eco GES] Avertissement initialisation Firestore (le serveur poursuit son démarrage):', fsErr);
  }

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
    const fs = await import('fs');
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[Eco GES] Dossier dist introuvable en production, basculement en mode middleware Vite de repli.');
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
    }
  }

  // 5. Middleware global d'interception d'erreurs Express (garantit qu'aucune route ne fait tomber le serveur)
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Eco GES] Erreur Express interceptée:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Une erreur interne est survenue sur le serveur.',
        details: err?.message || 'Erreur inconnue'
      });
    }
  });

  // 6. Démarrage du serveur HTTP avec écouteur d'erreur résilient
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`FAITH SCHOOL MANAGER actif sur http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'développement'})`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[CRITICAL] Le port ${PORT} est temporairement occupé (EADDRINUSE). Le serveur évite un arrêt brutal.`);
    } else {
      console.error('[CRITICAL] Erreur du serveur HTTP:', err);
    }
  });

  // Gestion de la terminaison propre du processus
  process.on('SIGTERM', () => {
    console.log('[Eco GES] Signal SIGTERM reçu, fermeture propre...');
    server.close(() => {
      console.log('[Eco GES] Serveur arrêté.');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error('Erreur fatale au lancement du serveur:', err);
});

