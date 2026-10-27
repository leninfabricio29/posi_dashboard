// Declaraciones de tipos globales para el proyecto

// Permitir importación de archivos CSS
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Permitir importación de archivos de imagen
declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.jpg" {
  const content: string;
  export default content;
}

declare module "*.jpeg" {
  const content: string;
  export default content;
}

declare module "*.gif" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}
