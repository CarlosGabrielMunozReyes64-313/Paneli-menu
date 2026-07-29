import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import { optimizar } from './cloudinary'
import PaneliLogo from './asets/logo/paneli_completo_negro.png'
import './App.css'

// El tipo de un plato tal como vive en Firestore.
interface Plato {
  id: string
  nombre: string
  descripcion?: string
  precio?: number
  categoria?: string
  especial?: boolean
  disponible?: boolean
  foto_url?: string
  orden?: number
}

// La apariencia que publica la APK desde la pestaña "Diseño".
interface Diseno {
  fondo_color: string
  fondo_url: string
  fondo_opacidad: number
  color_acento: string
  tamano_letra: 'normal' | 'grande' | 'extra'
}

const DISENO_POR_DEFECTO: Diseno = {
  fondo_color: '#fbf8f3',
  fondo_url: '',
  fondo_opacidad: 0.2,
  color_acento: '#6b4a2f',
  tamano_letra: 'grande',
}

// Mismo tope que la APK: por encima de 0.35 el fondo se come el texto.
const OPACIDAD_MAXIMA = 0.35

const ESCALAS: Record<Diseno['tamano_letra'], number> = {
  normal: 1,
  grande: 1.12,
  extra: 1.25,
}

const CATEGORIAS = [
  { id: 'platos', nombre: 'Platos', titulo: 'PLATOS' },
  { id: 'sopas', nombre: 'Sopas', titulo: 'SOPAS DEL DÍA' },
  { id: 'especiales', nombre: 'Especiales', titulo: 'ESPECIALES' },
  { id: 'bebidas', nombre: 'Bebidas', titulo: 'BEBIDAS' },
] as const

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function App() {
  const [platos, setPlatos] = useState<Plato[]>([])
  const [diseno, setDiseno] = useState<Diseno>(DISENO_POR_DEFECTO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [categoria, setCategoria] = useState<string>('platos')
  const [ampliada, setAmpliada] = useState<Plato | null>(null)

  useEffect(() => {
    // onSnapshot deja una conexion abierta. Cuando la APK escribe en
    // Firestore, esta funcion se vuelve a ejecutar sola: sin recargar,
    // sin polling, sin servidor propio en el medio.
    const consulta = query(collection(db, 'platos'), orderBy('orden'))

    const cancelar = onSnapshot(
      consulta,
      (snap) => {
        setPlatos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Plato))
        setCargando(false)
      },
      (e) => {
        setError(e.message)
        setCargando(false)
      },
    )

    return cancelar
  }, [])

  useEffect(() => {
    // Misma idea, un solo documento: la apariencia. Si no existe todavia,
    // se queda el diseno por defecto y la pagina se ve igual que siempre.
    const cancelar = onSnapshot(
      doc(db, 'store_settings', 'menu'),
      (snap) => {
        if (!snap.exists()) return
        const d = snap.data() as Partial<Diseno>
        setDiseno({
          ...DISENO_POR_DEFECTO,
          ...d,
          fondo_opacidad: Math.min(
            Number(d.fondo_opacidad ?? DISENO_POR_DEFECTO.fondo_opacidad),
            OPACIDAD_MAXIMA,
          ),
        })
      },
      // Un fallo aqui no debe romper el menu: es solo decoracion.
      () => {},
    )

    return cancelar
  }, [])

  useEffect(() => {
    // Las variables van en <html> y no en un div, porque el color de fondo
    // del <body> y el tamano de letra tienen que cambiar tambien.
    const raiz = document.documentElement.style
    raiz.setProperty('--fondo-color', diseno.fondo_color)
    raiz.setProperty('--acento', diseno.color_acento)
    raiz.setProperty(
      '--escala',
      String(ESCALAS[diseno.tamano_letra] ?? ESCALAS.grande),
    )
  }, [diseno])

  // Cerrar el modal con Escape, y bloquear el scroll de atras.
  useEffect(() => {
    if (!ampliada) return
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAmpliada(null)
    }
    window.addEventListener('keydown', alPulsar)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', alPulsar)
      document.body.style.overflow = ''
    }
  }, [ampliada])

  // "Especiales" no es una categoria real: es un filtro sobre el mismo dato.
  const visibles =
    categoria === 'especiales'
      ? platos.filter((p) => p.especial === true)
      : platos.filter((p) => p.categoria === categoria)

  const nombreSeccion =
    CATEGORIAS.find((c) => c.id === categoria)?.titulo ?? ''

  const vacio =
    categoria === 'sopas'
      ? 'Hoy no hay sopa publicada.'
      : 'Todavia no hay nada en esta seccion.'

  return (
    <>
      {/* Capa de fondo: fija, detras de todo y sin capturar toques. */}
      {diseno.fondo_url && (
        <div
          className="fondo-imagen"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${optimizar(diseno.fondo_url, { ancho: 1200 })})`,
            opacity: diseno.fondo_opacidad,
          }}
        />
      )}

      <div className="pagina">
        <header className="cabecera">
          <img className="logo" src={PaneliLogo} alt="Paneli" />
          <h1>MENÚ</h1>
        </header>

        <nav className="categorias">
          {CATEGORIAS.map((c) => (
            <button
              key={c.id}
              className={c.id === categoria ? 'cat activa' : 'cat'}
              onClick={() => setCategoria(c.id)}
            >
              {c.nombre}
            </button>
          ))}
        </nav>

        <h2 className="titulo-seccion">{nombreSeccion}</h2>

        {cargando && <p className="aviso">Cargando el menu...</p>}
        {error && (
          <p className="aviso error">No se pudo leer el menu: {error}</p>
        )}
        {!cargando && !error && visibles.length === 0 && (
          <p className="aviso">{vacio}</p>
        )}

        <ul className="lista">
          {visibles.map((p, i) => (
            <PlatoFila
              key={p.id}
              plato={p}
              numero={i + 1}
              onVerFoto={setAmpliada}
            />
          ))}
        </ul>

        <footer className="pie">
          Los precios pueden cambiar sin previo aviso.
        </footer>

        {ampliada && (
          <Modal plato={ampliada} onCerrar={() => setAmpliada(null)} />
        )}
      </div>
    </>
  )
}

function PlatoFila({
  plato,
  numero,
  onVerFoto,
}: {
  plato: Plato
  numero: number
  onVerFoto: (p: Plato) => void
}) {
  const agotado = plato.disponible === false
  const tieneFoto = Boolean(plato.foto_url)

  return (
    <li className={agotado ? 'plato agotado' : 'plato'}>
      {/* El numero grande permite pedir senalando o diciendo "el dos". */}
      <span className="numero">{numero}</span>

      <div className="texto">
        <div className="linea-nombre">
          <h3>{plato.nombre}</h3>
          {plato.especial && <span className="marca">HOY</span>}
        </div>

        {plato.descripcion && <p className="descripcion">{plato.descripcion}</p>}

        <p className="precio">
          {agotado ? 'Hoy no hay' : pesos.format(plato.precio ?? 0)}
        </p>
      </div>

      {tieneFoto ? (
        <button
          className="foto foto-tocable"
          onClick={() => onVerFoto(plato)}
          aria-label={`Ver foto de ${plato.nombre} en grande`}
        >
          <img
            src={optimizar(plato.foto_url, { ancho: 200, recortar: true })}
            alt=""
            loading="lazy"
          />
          <span className="lupa" aria-hidden="true">
            {'\u2922'}
          </span>
        </button>
      ) : (
        <div className="foto" />
      )}
    </li>
  )
}

function Modal({ plato, onCerrar }: { plato: Plato; onCerrar: () => void }) {
  const agotado = plato.disponible === false

  return (
    <div
      className="modal-fondo"
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      aria-label={plato.nombre}
    >
      {/* stopPropagation: tocar el fondo cierra, tocar la tarjeta no. */}
      <div className="modal-caja" onClick={(e) => e.stopPropagation()}>
        <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
          {'\u2715'}
        </button>

        <img
          className="modal-img"
          src={optimizar(plato.foto_url, { ancho: 1000 })}
          alt={plato.nombre}
        />

        <div className="modal-info">
          <div className="linea-nombre">
            <h3>{plato.nombre}</h3>
            {plato.especial && <span className="marca">HOY</span>}
          </div>
          {plato.descripcion && <p>{plato.descripcion}</p>}
          <p className="modal-precio">
            {agotado ? 'Hoy no hay' : pesos.format(plato.precio ?? 0)}
          </p>
        </div>
      </div>
    </div>
  )
}