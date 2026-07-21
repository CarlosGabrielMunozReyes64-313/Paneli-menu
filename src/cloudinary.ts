/**
 * Pide a Cloudinary una variante de la imagen sin re-subir nada.
 * Los parámetros viajan dentro de la URL y Cloudinary genera la versión
 * al vuelo: la miniatura pesa ~15 kb, y la grande solo se descarga
 * cuando alguien abre el modal.
 */
export function optimizar(
  url: string | undefined,
  opciones: { ancho?: number; recortar?: boolean } = {},
): string {
  const { ancho = 800, recortar = false } = opciones
  if (!url || !url.includes('/upload/')) return url ?? ''
  const t = recortar
    ? `w_${ancho},h_${ancho},c_fill,f_webp,q_auto`
    : `w_${ancho},f_webp,q_auto`
  return url.replace('/upload/', `/upload/${t}/`)
}
