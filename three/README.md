# Hueco Mundo 3D

Cena Three.js (deserto, lua crescente, areia à deriva) com suporte a avatares **VRM** e um **Cero** no clique.

- Sem build e sem dependência no `package.json`: `three@0.170.0` e `@pixiv/three-vrm@3.4.0` vêm do jsDelivr por `importmap`.
- `npm run serve` e abra `/three/`. Arraste um `.vrm`, escolha pelo botão ou use `?vrm=URL` (o servidor precisa liberar CORS).
- Sem VRM, aparece uma máscara de Hollow. Respeita `prefers-reduced-motion`.
- Use só modelos VRM com licença que permita o seu uso.

> O backdrop do Claude Code aceita só SVG, então o 3D roda nesta página à parte; o tema do Claude Code está em [`claude-code/hueco-look`](../claude-code/hueco-look).
