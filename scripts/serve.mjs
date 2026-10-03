#!/usr/bin/env node
// Abre a página de demonstração em http://127.0.0.1:8080 (PORT muda a porta).
import { serve } from "./lib/static-server.mjs";

const { url } = await serve({ port: Number(process.env.PORT) || 8080 });
console.log(`Hueco Mundo em ${url}  (Ctrl+C para sair)`);
