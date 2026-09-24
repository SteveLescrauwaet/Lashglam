import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CreditCard,
  Euro,
  ImagePlus,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  Trash2,
  Upload,
  WalletCards,
  X,
} from 'lucide-react'
import { supabase, supabaseConfigured } from './lib/supabase.js'

const PAYMENTS = [
  { id: 'espece', label: 'Espèce', icon: Euro },
  { id: 'carte_perso', label: 'Carte compte perso', icon: CreditCard },
  { id: 'carte_pro', label: 'Carte compte pro', icon: BriefcaseBusiness },
]

const DEFAULT_CATALOG = [
  {
    name: 'Extensions de cils - cil à cil',
    type: 'prestation',
    price: 40,
    duration_minutes: 120,
    image_url: 'https://iara.b-cdn.net/9c17613362ec3b376082c3cddd857edf_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 0,
    is_solo: false,
  },
  {
    name: 'REMPLISSAGE - pose cil à cil',
    type: 'prestation',
    price: 30,
    duration_minutes: 120,
    image_url: 'https://iara.b-cdn.net/f91df88d3f783621d7d3f3bd14f3e165_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 1,
    is_solo: false,
  },
  {
    name: 'Extensions de cils - pose mixte',
    type: 'prestation',
    price: 45,
    duration_minutes: 135,
    image_url: 'https://iara.b-cdn.net/a47413d364352ce4251f52d0f9c81cbe_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 2,
    is_solo: false,
  },
  {
    name: 'REMPLISSAGE - pose mixte',
    type: 'prestation',
    price: 35,
    duration_minutes: 120,
    image_url: 'https://iara.b-cdn.net/370c5fd9e8db8a553c959fcc06f31a52_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 3,
    is_solo: false,
  },
  {
    name: 'Extensions de cils - volume russe',
    type: 'prestation',
    price: 50,
    duration_minutes: 135,
    image_url: 'https://iara.b-cdn.net/c6dbf372fabee92b7b725191acbeafb5_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 4,
    is_solo: false,
  },
  {
    name: 'REMPLISSAGE - volume russe',
    type: 'prestation',
    price: 40,
    duration_minutes: 120,
    image_url: 'https://iara.b-cdn.net/0a1a1f0d2ceb79c7bf4b65dad6588b85_DpvsnU05Ib-cover.jpg?class=xs',
    sort_order: 5,
    is_solo: false,
  },
  {
    name: 'Rehaussement de cils',
    type: 'prestation',
    price: 30,
    duration_minutes: 75,
    image_url: 'https://iara.b-cdn.net/6db8420092706a897e9dffd5246743f1_CATALOGUE%20TAILLE%20540-2.png?class=xs',
    sort_order: 6,
    is_solo: true,
  },
  {
    name: 'Rehaussement de cils avec teinture',
    type: 'prestation',
    price: 35,
    duration_minutes: 105,
    image_url: 'https://iara.b-cdn.net/69e599f5dafa21a230c30e3e713ac60b_5afe2951a2c827189c361e831161da7d.jpg?class=xs',
    sort_order: 7,
    is_solo: true,
  },
  {
    name: 'Browlift',
    type: 'prestation',
    price: 25,
    duration_minutes: 45,
    image_url: 'https://iara.b-cdn.net/48685eb9e1d5e4a427daeb7f5865097b_657c220d8a19177d202581bc17125d74.jpg?class=xs',
    sort_order: 8,
    is_solo: true,
  },
  {
    name: 'Dépose',
    type: 'prestation',
    price: 15,
    duration_minutes: 20,
    image_url: 'https://iara.b-cdn.net/d3b1bd5e6902b508b6b6f441910cdf65_EyelashRemover.jpg?class=xs',
    sort_order: 9,
    is_solo: true,
  },
]

const euro = (value) =>
  new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0))

const monthLabel = (date) =>
  new Intl.DateTimeFormat('fr-BE', { month: 'long', year: 'numeric' }).format(date)

const dateLabel = (value) =>
  new Intl.DateTimeFormat('fr-BE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

const paymentLabel = (id) => PAYMENTS.find((p) => p.id === id)?.label || id
const typeLabel = (type) => (type === 'prestation' ? 'Prestation' : 'Produit')

function previousMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() - 1, 1)
}

function nextMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}

function sameMonth(value, month) {
  const date = new Date(value)
  return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
}

function toDateInput(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function saleTotal(sale) {
  return (sale.sale_lines || []).reduce(
    (sum, line) => sum + Number(line.unit_price || 0) * Number(line.quantity || 0),
    0,
  )
}

function saleTypeTotal(sale, type) {
  return (sale.sale_lines || [])
    .filter((line) => line.type_snapshot === type)
    .reduce((sum, line) => sum + Number(line.unit_price || 0) * Number(line.quantity || 0), 0)
}

function ConfigMissing() {
  return (
    <div className="center-screen">
      <div className="auth-card">
        <div className="brand-mark">CA</div>
        <h1>Configuration Supabase requise</h1>
        <p>
          La connexion Supabase n’est pas configurée. Renseigne l’URL et la clé publishable dans <code>src/lib/supabase.js</code> ou via les variables d’environnement Vite.
        </p>
        <pre>{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_PUBLISHABLE_KEY=...`}</pre>
      </div>
    </div>
  )
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    setError('')

    const action = mode === 'login'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { data, error: authError } = await action

    if (authError) setError(authError.message)
    else if (mode === 'signup' && !data.session) {
      setMessage('Compte créé. Vérifie ton e-mail si la confirmation est activée dans Supabase.')
    }
    setBusy(false)
  }

  return (
    <div className="center-screen">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand-mark">CA</div>
        <p className="eyebrow">SUIVI D’ACTIVITÉ</p>
        <h1>{mode === 'login' ? 'Connexion' : 'Créer le compte'}</h1>
        <p className="muted">Tes prestations, ventes et moyens de paiement, synchronisés avec Supabase.</p>

        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="alert error">{error}</div>}
        {message && <div className="alert success">{message}</div>}

        <button className="primary-button full" disabled={busy}>
          {busy ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
        <button
          type="button"
          className="text-button full"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError('')
            setMessage('')
          }}
        >
          {mode === 'login' ? 'Première utilisation ? Créer un compte' : 'J’ai déjà un compte'}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (!supabaseConfigured) return <ConfigMissing />
  if (loading) return <div className="center-screen"><div className="spinner" /></div>
  if (!session) return <AuthScreen />

  return <MainApp session={session} />
}

function MainApp({ session }) {
  const user = session.user
  const [tab, setTab] = useState('dashboard')
  const [catalog, setCatalog] = useState([])
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function ensureDefaultCatalog() {
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('user_id, defaults_seeded')
      .eq('user_id', user.id)
      .maybeSingle()

    if (settingsError) throw settingsError

    let current = settings
    if (!current) {
      const { data, error: insertSettingsError } = await supabase
        .from('user_settings')
        .insert({ user_id: user.id, defaults_seeded: false })
        .select()
        .single()
      if (insertSettingsError) throw insertSettingsError
      current = data
    }

    if (!current.defaults_seeded) {
      const rows = DEFAULT_CATALOG.map((item) => ({ ...item, user_id: user.id }))
      const { error: seedError } = await supabase.from('catalog_items').insert(rows)
      if (seedError) throw seedError
      const { error: updateError } = await supabase
        .from('user_settings')
        .update({ defaults_seeded: true })
        .eq('user_id', user.id)
      if (updateError) throw updateError
    }
  }

  async function refresh() {
    try {
      setError('')
      await ensureDefaultCatalog()

      const [{ data: catalogData, error: catalogError }, { data: salesData, error: salesError }] = await Promise.all([
        supabase.from('catalog_items').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('sales')
          .select('id, sale_date, payment_method, note, created_at, sale_lines(id, catalog_item_id, name_snapshot, type_snapshot, unit_price, quantity)')
          .order('sale_date', { ascending: false }),
      ])

      if (catalogError) throw catalogError
      if (salesError) throw salesError
      setCatalog(catalogData || [])
      setSales(salesData || [])
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()

    const handleVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisible)
    return () => document.removeEventListener('visibilitychange', handleVisible)
  }, [user.id])

  async function addSale({ cartLines, paymentMethod, note, date }) {
    const saleDate = new Date(`${date}T${new Date().toTimeString().slice(0, 8)}`)
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        user_id: user.id,
        sale_date: saleDate.toISOString(),
        payment_method: paymentMethod,
        note: note.trim(),
      })
      .select()
      .single()

    if (saleError) throw saleError

    const rows = cartLines.map((line) => ({
      user_id: user.id,
      sale_id: sale.id,
      catalog_item_id: line.item.id,
      name_snapshot: line.item.name,
      type_snapshot: line.item.type,
      unit_price: line.item.price,
      quantity: line.quantity,
    }))

    const { error: linesError } = await supabase.from('sale_lines').insert(rows)
    if (linesError) {
      await supabase.from('sales').delete().eq('id', sale.id)
      throw linesError
    }
    await refresh()
  }

  async function deleteSale(id) {
    const { error: deleteError } = await supabase.from('sales').delete().eq('id', id)
    if (deleteError) throw deleteError
    await refresh()
  }

  async function uploadCatalogImage(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${user.id}/${crypto.randomUUID()}.${ext || 'jpg'}`
    const { error: uploadError } = await supabase.storage.from('catalog-images').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('catalog-images').getPublicUrl(path)
    return { url: data.publicUrl, path }
  }

  function storagePathFromUrl(url) {
    if (!url) return null
    const marker = '/storage/v1/object/public/catalog-images/'
    const index = url.indexOf(marker)
    return index >= 0 ? decodeURIComponent(url.slice(index + marker.length)) : null
  }

  async function saveCatalogItem({ item, file, removeImage }) {
    let imageUrl = removeImage ? null : item.image_url || null
    let newPath = null
    const oldPath = storagePathFromUrl(item.image_url)

    if (file) {
      const uploaded = await uploadCatalogImage(file)
      imageUrl = uploaded.url
      newPath = uploaded.path
    }

    try {
      if (item.id) {
        const { error: updateError } = await supabase
          .from('catalog_items')
          .update({
            name: item.name.trim(),
            type: item.type,
            price: Number(item.price),
            duration_minutes: Number(item.duration_minutes || 0),
            image_url: imageUrl,
            is_solo: Boolean(item.is_solo),
          })
          .eq('id', item.id)
        if (updateError) throw updateError
      } else {
        const sameType = catalog.filter((entry) => entry.type === item.type)
        const nextOrder = sameType.length ? Math.max(...sameType.map((entry) => Number(entry.sort_order || 0))) + 1 : 0
        const { error: insertError } = await supabase.from('catalog_items').insert({
          user_id: user.id,
          name: item.name.trim(),
          type: item.type,
          price: Number(item.price),
          duration_minutes: Number(item.duration_minutes || 0),
          image_url: imageUrl,
          is_solo: Boolean(item.is_solo),
          sort_order: nextOrder,
        })
        if (insertError) throw insertError
      }
    } catch (err) {
      if (newPath) await supabase.storage.from('catalog-images').remove([newPath])
      throw err
    }

    if ((file || removeImage) && oldPath && oldPath !== newPath) {
      await supabase.storage.from('catalog-images').remove([oldPath])
    }
    await refresh()
  }

  async function deleteCatalogItem(item) {
    const { error: deleteError } = await supabase.from('catalog_items').delete().eq('id', item.id)
    if (deleteError) throw deleteError
    const path = storagePathFromUrl(item.image_url)
    if (path) await supabase.storage.from('catalog-images').remove([path])
    await refresh()
  }

  async function moveCatalogItem(item, direction) {
    const list = catalog
      .filter((entry) => entry.type === item.type)
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
    const index = list.findIndex((entry) => entry.id === item.id)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= list.length) return

    const target = list[targetIndex]
    const itemOrder = Number(item.sort_order)
    const targetOrder = Number(target.sort_order)

    const [{ error: firstError }, { error: secondError }] = await Promise.all([
      supabase.from('catalog_items').update({ sort_order: targetOrder }).eq('id', item.id),
      supabase.from('catalog_items').update({ sort_order: itemOrder }).eq('id', target.id),
    ])
    if (firstError) throw firstError
    if (secondError) throw secondError
    await refresh()
  }

  const tabs = [
    { id: 'dashboard', label: 'CA', icon: BarChart3 },
    { id: 'checkout', label: 'Encaisser', icon: WalletCards },
    { id: 'history', label: 'Historique', icon: ReceiptText },
    { id: 'catalog', label: 'Catalogue', icon: Package },
  ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SUIVI D’ACTIVITÉ</p>
          <h1>Beauty CA</h1>
        </div>
        <button className="icon-button" title="Déconnexion" onClick={() => supabase.auth.signOut()}>
          <LogOut size={20} />
        </button>
      </header>

      {error && <div className="global-alert">{error}</div>}

      <main className="main-content">
        {loading ? (
          <div className="center-panel"><div className="spinner" /></div>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard sales={sales} />}
            {tab === 'checkout' && <Checkout catalog={catalog} onSave={addSale} />}
            {tab === 'history' && <History sales={sales} onDelete={deleteSale} />}
            {tab === 'catalog' && (
              <Catalog
                catalog={catalog}
                onSave={saveCatalogItem}
                onDelete={deleteCatalogItem}
                onMove={moveCatalogItem}
              />
            )}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function MonthSelector({ value, onChange }) {
  return (
    <div className="month-selector">
      <button className="icon-button" onClick={() => onChange(previousMonth(value))}><ArrowLeft size={20} /></button>
      <strong>{monthLabel(value)}</strong>
      <button className="icon-button" onClick={() => onChange(nextMonth(value))}><ArrowRight size={20} /></button>
    </div>
  )
}

function Dashboard({ sales }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const monthSales = useMemo(() => sales.filter((sale) => sameMonth(sale.sale_date, month)), [sales, month])
  const total = monthSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
  const prestations = monthSales.reduce((sum, sale) => sum + saleTypeTotal(sale, 'prestation'), 0)
  const produits = monthSales.reduce((sum, sale) => sum + saleTypeTotal(sale, 'produit'), 0)
  const average = monthSales.length ? total / monthSales.length : 0

  return (
    <section className="page">
      <MonthSelector value={month} onChange={setMonth} />

      <div className="hero-card">
        <span>Chiffre d’affaires</span>
        <strong>{euro(total)}</strong>
        <small>{monthSales.length} vente{monthSales.length > 1 ? 's' : ''}</small>
      </div>

      <div className="metric-grid">
        <MetricCard icon={Sparkles} label="Prestations" value={euro(prestations)} />
        <MetricCard icon={ShoppingBag} label="Produits" value={euro(produits)} />
        <MetricCard icon={ReceiptText} label="Panier moyen" value={euro(average)} />
      </div>

      <div className="section-title-row"><h2>Moyens de paiement</h2></div>
      <div className="payment-breakdowns">
        {PAYMENTS.map((payment) => {
          const amount = monthSales
            .filter((sale) => sale.payment_method === payment.id)
            .reduce((sum, sale) => sum + saleTotal(sale), 0)
          const ratio = total > 0 ? amount / total : 0
          return <PaymentBreakdown key={payment.id} payment={payment} amount={amount} ratio={ratio} />
        })}
      </div>
    </section>
  )
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="metric-card">
      <div className="metric-icon"><Icon size={22} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function PaymentBreakdown({ payment, amount, ratio }) {
  const Icon = payment.icon
  return (
    <div className="payment-card">
      <div className="payment-card-head">
        <div className="inline"><div className="small-icon"><Icon size={18} /></div><strong>{payment.label}</strong></div>
        <div className="right"><strong>{euro(amount)}</strong><span>{Math.round(ratio * 100)} %</span></div>
      </div>
      <div className="progress"><span style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }} /></div>
    </div>
  )
}

function Checkout({ catalog, onSave }) {
  const [filter, setFilter] = useState('all')
  const [cart, setCart] = useState({})
  const [paymentMethod, setPaymentMethod] = useState('espece')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(toDateInput())
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const visible = useMemo(
    () => catalog.filter((item) => filter === 'all' || item.type === filter),
    [catalog, filter],
  )
  const cartLines = Object.values(cart)
  const total = cartLines.reduce((sum, line) => sum + Number(line.item.price) * line.quantity, 0)

  function add(item) {
    setCart((current) => ({
      ...current,
      [item.id]: current[item.id]
        ? { ...current[item.id], quantity: current[item.id].quantity + 1 }
        : { item, quantity: 1 },
    }))
  }

  function quantity(id, delta) {
    setCart((current) => {
      const next = { ...current }
      if (!next[id]) return current
      const value = next[id].quantity + delta
      if (value <= 0) delete next[id]
      else next[id] = { ...next[id], quantity: value }
      return next
    })
  }

  async function save() {
    if (!cartLines.length || busy) return
    setBusy(true)
    setMessage('')
    try {
      await onSave({ cartLines, paymentMethod, note, date })
      setCart({})
      setPaymentMethod('espece')
      setNote('')
      setDate(toDateInput())
      setMessage('Vente enregistrée.')
    } catch (err) {
      setMessage(`Erreur : ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page checkout-page">
      <div className="checkout-layout">
        <div className="catalog-zone">
          <div className="chips">
            {[
              ['all', 'Tout'],
              ['prestation', 'Prestations'],
              ['produit', 'Produits'],
            ].map(([id, label]) => (
              <button key={id} className={filter === id ? 'chip active' : 'chip'} onClick={() => setFilter(id)}>{label}</button>
            ))}
          </div>

          <div className="catalog-grid">
            {visible.map((item) => (
              <button
                key={item.id}
                className={`catalog-card ${item.is_solo ? 'solo' : ''}`}
                onClick={() => add(item)}
              >
                <CatalogImage item={item} />
                <div className="catalog-card-content">
                  <strong>{item.name}</strong>
                  <span>{typeLabel(item.type)}{item.duration_minutes ? ` • ${formatDuration(item.duration_minutes)}` : ''}</span>
                  <b>{euro(item.price)}</b>
                  <div className="add-hint"><Plus size={16} /> Ajouter</div>
                </div>
              </button>
            ))}
            {!visible.length && <div className="empty-state">Aucun élément dans cette catégorie.</div>}
          </div>
        </div>

        <aside className="cart-panel">
          <div className="section-title-row"><h2>Vente en cours</h2><span>{cartLines.length} ligne{cartLines.length > 1 ? 's' : ''}</span></div>
          <div className="cart-lines">
            {cartLines.length === 0 ? (
              <div className="empty-state compact">Clique sur une prestation ou un produit pour l’ajouter.</div>
            ) : cartLines.map((line) => (
              <div className="cart-line" key={line.item.id}>
                <div className="cart-line-title">
                  <strong>{line.item.name}</strong>
                  <span>{euro(Number(line.item.price) * line.quantity)}</span>
                </div>
                <div className="quantity-controls">
                  <button onClick={() => quantity(line.item.id, -1)}><Minus size={16} /></button>
                  <b>{line.quantity}</b>
                  <button onClick={() => quantity(line.item.id, 1)}><Plus size={16} /></button>
                  <small>× {euro(line.item.price)}</small>
                </div>
              </div>
            ))}
          </div>

          <label>
            Date de la vente
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Note / cliente (facultatif)
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. acompte, prénom…" />
          </label>

          <div>
            <span className="field-label">Moyen de paiement</span>
            <div className="payment-choice-grid">
              {PAYMENTS.map((payment) => {
                const Icon = payment.icon
                return (
                  <button
                    key={payment.id}
                    className={paymentMethod === payment.id ? 'payment-choice active' : 'payment-choice'}
                    onClick={() => setPaymentMethod(payment.id)}
                  >
                    <Icon size={18} />
                    <span>{payment.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="cart-total"><span>Total</span><strong>{euro(total)}</strong></div>
          {message && <div className={message.startsWith('Erreur') ? 'alert error' : 'alert success'}>{message}</div>}
          <button className="primary-button full big" disabled={!cartLines.length || busy} onClick={save}>
            <Check size={19} /> {busy ? 'Enregistrement…' : 'Enregistrer la vente'}
          </button>
        </aside>
      </div>
    </section>
  )
}

function formatDuration(minutes) {
  const value = Number(minutes || 0)
  const hours = Math.floor(value / 60)
  const mins = value % 60
  if (!hours) return `${mins} min`
  if (!mins) return `${hours} h`
  return `${hours} h ${String(mins).padStart(2, '0')}`
}

function CatalogImage({ item, className = '' }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [item.image_url])

  if (!item.image_url || failed) {
    return <div className={`image-fallback ${className}`}>{item.type === 'prestation' ? <Sparkles /> : <ShoppingBag />}</div>
  }
  return (
    <img
      className={`catalog-image ${className}`}
      src={item.image_url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

function History({ sales, onDelete }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [busyId, setBusyId] = useState(null)
  const monthSales = useMemo(() => sales.filter((sale) => sameMonth(sale.sale_date, month)), [sales, month])

  async function remove(sale) {
    if (!window.confirm(`Supprimer la vente de ${euro(saleTotal(sale))} ?`)) return
    setBusyId(sale.id)
    try {
      await onDelete(sale.id)
    } catch (err) {
      window.alert(err.message || err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page">
      <MonthSelector value={month} onChange={setMonth} />
      <div className="history-summary">{monthSales.length} vente{monthSales.length > 1 ? 's' : ''} • {euro(monthSales.reduce((sum, sale) => sum + saleTotal(sale), 0))}</div>

      <div className="history-groups">
        {PAYMENTS.map((payment) => {
          const methodSales = monthSales.filter((sale) => sale.payment_method === payment.id)
          const methodTotal = methodSales.reduce((sum, sale) => sum + saleTotal(sale), 0)
          const Icon = payment.icon
          return (
            <details className="payment-history" key={payment.id} open>
              <summary>
                <div className="payment-history-icon"><Icon size={20} /></div>
                <div className="payment-history-title"><strong>{payment.label}</strong><span>{methodSales.length} vente{methodSales.length > 1 ? 's' : ''}</span></div>
                <b>{euro(methodTotal)}</b>
                <ChevronDown className="chevron" size={20} />
              </summary>
              <div className="payment-history-body">
                {methodSales.length ? methodSales.map((sale) => (
                  <details className="sale-card" key={sale.id}>
                    <summary>
                      <div><strong>{euro(saleTotal(sale))}</strong><span>{dateLabel(sale.sale_date)}</span></div>
                      <button
                        className="danger-icon"
                        title="Supprimer"
                        disabled={busyId === sale.id}
                        onClick={(event) => { event.preventDefault(); event.stopPropagation(); remove(sale) }}
                      ><Trash2 size={17} /></button>
                    </summary>
                    <div className="sale-details">
                      {(sale.sale_lines || []).map((line) => (
                        <div className="sale-line" key={line.id}>
                          <div><strong>{line.name_snapshot}</strong><span>{typeLabel(line.type_snapshot)} • {line.quantity} × {euro(line.unit_price)}</span></div>
                          <b>{euro(Number(line.unit_price) * Number(line.quantity))}</b>
                        </div>
                      ))}
                      {sale.note && <div className="sale-note"><strong>Note :</strong> {sale.note}</div>}
                    </div>
                  </details>
                )) : <div className="empty-state compact">Aucune vente avec ce moyen de paiement.</div>}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}

function Catalog({ catalog, onSave, onDelete, onMove }) {
  const [editing, setEditing] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function remove(item) {
    if (!window.confirm(`Supprimer « ${item.name} » du catalogue ?`)) return
    setBusyId(item.id)
    try {
      await onDelete(item)
    } catch (err) {
      window.alert(err.message || err)
    } finally {
      setBusyId(null)
    }
  }

  async function move(item, direction) {
    setBusyId(item.id)
    try {
      await onMove(item, direction)
    } catch (err) {
      window.alert(err.message || err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="page">
      <div className="catalog-admin-head">
        <div><h2>Catalogue</h2><p className="muted">Ajoute tes produits depuis ton PC et change l’ordre d’affichage.</p></div>
        <button className="primary-button" onClick={() => setEditing({ type: 'prestation' })}><Plus size={18} /> Ajouter</button>
      </div>

      {['prestation', 'produit'].map((type) => {
        const items = catalog.filter((item) => item.type === type).sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        return (
          <div className="catalog-admin-section" key={type}>
            <div className="section-title-row">
              <h2>{type === 'prestation' ? 'Prestations' : 'Produits'}</h2>
              <button className="secondary-button" onClick={() => setEditing({ type })}><Plus size={16} /> Ajouter</button>
            </div>
            <div className="admin-list">
              {items.map((item, index) => (
                <div className="admin-item" key={item.id}>
                  <div className="admin-thumb"><CatalogImage item={item} /></div>
                  <div className="admin-item-main">
                    <strong>{item.name}</strong>
                    <span>{euro(item.price)}{item.duration_minutes ? ` • ${formatDuration(item.duration_minutes)}` : ''}{item.is_solo ? ' • pleine largeur' : ''}</span>
                  </div>
                  <div className="admin-actions">
                    <button className="icon-button" disabled={index === 0 || busyId === item.id} onClick={() => move(item, -1)} title="Monter"><ArrowUp size={17} /></button>
                    <button className="icon-button" disabled={index === items.length - 1 || busyId === item.id} onClick={() => move(item, 1)} title="Descendre"><ArrowDown size={17} /></button>
                    <button className="icon-button" onClick={() => setEditing(item)} title="Modifier"><Pencil size={17} /></button>
                    <button className="danger-icon" disabled={busyId === item.id} onClick={() => remove(item)} title="Supprimer"><Trash2 size={17} /></button>
                  </div>
                </div>
              ))}
              {!items.length && <div className="empty-state compact">Aucun {type === 'prestation' ? 'soin' : 'produit'}.</div>}
            </div>
          </div>
        )
      })}

      {editing && <CatalogModal initial={editing} onClose={() => setEditing(null)} onSave={async (payload) => {
        await onSave(payload)
        setEditing(null)
      }} />}
    </section>
  )
}

function CatalogModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || '',
    type: initial.type || 'prestation',
    price: initial.price ?? '',
    duration_minutes: initial.duration_minutes ?? 0,
    image_url: initial.image_url || null,
    is_solo: Boolean(initial.is_solo),
  })
  const [file, setFile] = useState(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [preview, setPreview] = useState(initial.image_url || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pickFile(event) {
    const next = event.target.files?.[0]
    if (!next) return
    setFile(next)
    setRemoveImage(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return
    setBusy(true)
    setError('')
    try {
      await onSave({ item: form, file, removeImage })
    } catch (err) {
      setError(err.message || String(err))
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-head"><div><p className="eyebrow">CATALOGUE</p><h2>{form.id ? 'Modifier' : 'Ajouter'}</h2></div><button type="button" className="icon-button" onClick={onClose}><X size={20} /></button></div>

        <div className="form-grid">
          <label className="full-span">
            Nom
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </label>
          <label>
            Type
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, is_solo: e.target.value === 'produit' ? false : form.is_solo })}>
              <option value="prestation">Prestation</option>
              <option value="produit">Produit</option>
            </select>
          </label>
          <label>
            Prix (€)
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          </label>
          {form.type === 'prestation' && (
            <label>
              Durée (minutes)
              <input type="number" min="0" step="5" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
            </label>
          )}
          {form.type === 'prestation' && (
            <label className="toggle-row">
              <input type="checkbox" checked={form.is_solo} onChange={(e) => setForm({ ...form, is_solo: e.target.checked })} />
              <span>Afficher seul sur toute la ligne</span>
            </label>
          )}
        </div>

        <div className="image-picker-block">
          <span className="field-label">Image</span>
          <div className="image-picker-content">
            <div className="image-preview">
              {preview && !removeImage ? <img src={preview} alt="Aperçu" /> : <ImagePlus size={32} />}
            </div>
            <div className="image-picker-actions">
              <label className="secondary-button file-button"><Upload size={17} /> Choisir une image sur le PC<input type="file" accept="image/png,image/jpeg,image/webp" onChange={pickFile} /></label>
              {(preview || form.image_url) && !removeImage && <button type="button" className="text-button" onClick={() => { setFile(null); setPreview(''); setRemoveImage(true) }}>Retirer l’image</button>}
              <small>JPG, PNG ou WebP. L’image sera envoyée dans Supabase Storage.</small>
            </div>
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>Annuler</button>
          <button className="primary-button" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </div>
      </form>
    </div>
  )
}
