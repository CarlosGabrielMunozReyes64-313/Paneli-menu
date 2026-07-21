import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import { optimizar } from './cloudinary'
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

const CATEGORIAS = [
  { id: 'platos', nombre: 'Platos' },
  { id: 'especiales', nombre: 'Especiales' },
  { id: 'bebidas', nombre: 'Bebidas' },
] as const

const pesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export default function App() {
  const [platos, setPlatos] = useState<Plato[]>([])
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
    CATEGORIAS.find((c) => c.id === categoria)?.nombre.toUpperCase() ?? ''

  return (
    <div className="pagina">
      <header className="cabecera">
        <p className="kicker">RESTAURANTE</p>
        <h1>PANELI</h1>
        <p className="lema">Comida casera al aire libre</p>
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
      {error && <p className="aviso error">No se pudo leer el menu: {error}</p>}
      {!cargando && !error && visibles.length === 0 && (
        <p className="aviso">Todavia no hay nada en esta seccion.</p>
      )}

      <ul className="lista">
        {visibles.map((p, i) => (
          <PlatoFila key={p.id} plato={p} numero={i + 1} onVerFoto={setAmpliada} />
        ))}
      </ul>

      <footer className="pie">Los precios pueden cambiar sin previo aviso.</footer>

      {ampliada && <Modal plato={ampliada} onCerrar={() => setAmpliada(null)} />}
    </div>
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
