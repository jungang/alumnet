import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AlumNet API',
      version: '1.0.0',
      description: 'RESTful API for AlumNet - AI-Powered Alumni Exhibition System',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Alumni', description: 'Alumni CRUD operations' },
      { name: 'Auth', description: 'Authentication' },
      { name: 'Content', description: 'Public content (messages, photos)' },
      { name: 'Admin', description: 'Admin dashboard operations' },
      { name: 'Backup', description: 'Database backup operations' },
      { name: 'Upload', description: 'File upload operations' },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const setupSwagger = (app: Express) => {
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};
