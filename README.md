# Simulador de consumo de material

Versión estática del simulador original en React, convertida a:

- `index.html`
- `styles.css`
- `script.js`

No requiere React, Node.js ni instalación de dependencias.

## Publicarlo en GitHub Pages

1. Crea un repositorio en GitHub.
2. Sube los tres archivos a la raíz del repositorio.
3. Ve a **Settings → Pages**.
4. En **Build and deployment**, selecciona:
   - Source: **Deploy from a branch**
   - Branch: `main`
   - Folder: `/ (root)`
5. Guarda la configuración.
6. GitHub generará una URL para visualizar el simulador.

El archivo `index.html` es la página principal.

## Datos incluidos

Los datos, fórmulas, tasas de extrusión, inventarios, capacidad de gaylord y lógica de cálculo fueron trasladados del componente React proporcionado.

Fuente: `simulador_extrusion.jsx`.
