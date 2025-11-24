import swaggerUi from "swagger-ui-express";
import YAML from 'yamljs';
const swaggerDocument = YAML.load('./src/docs/openapi.yaml');

export function swaggerDocs(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
