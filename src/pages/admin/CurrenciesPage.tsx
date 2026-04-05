import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'

const CBU_API = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/'

interface CbuRate {
  id: string
  Ccy: string
  CcyNm_UZ: string
  CcyNm_EN: string
  Nominal: string
  Rate: string
  Diff: string
  Date: string
}

const FEATURED = ['USD', 'EUR', 'GBP', 'RUB']

const CCY_COLORS: Record<string, string> = {
  USD: '#1d4ed8', EUR: '#7c3aed', RUB: '#dc2626', GBP: '#059669',
  JPY: '#d97706', CNY: '#dc2626', AZN: '#16a34a', KZT: '#2563eb',
  KRW: '#be185d', CAD: '#b45309', CHF: '#0891b2', AUD: '#7c3aed',
}

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-mono">
        {pad(time.getDate())}.{pad(time.getMonth() + 1)}.{time.getFullYear()}
      </span>
      <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-mono">
        {pad(time.getHours())}:{pad(time.getMinutes())}:{pad(time.getSeconds())}
      </span>
    </div>
  )
}

export default function CurrenciesPage() {
  const [fromCcy, setFromCcy] = useState('UZS')
  const [toCcy, setToCcy]     = useState('USD')
  const [fromAmt, setFromAmt] = useState('1000000')
  const [search, setSearch]   = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const { data: cbuRates = [], isLoading: cbuLoading, refetch: refetchCbu } = useQuery<CbuRate[]>({
    queryKey: ['cbu-rates'],
    queryFn: async () => {
      const res = await fetch(CBU_API)
      if (!res.ok) throw new Error('CBU API error')
      const data = await res.json()
      setLastUpdated(new Date())
      return data
    },
    refetchInterval: 60 * 60 * 1000,
    staleTime: 30 * 60 * 1000,
  })

  const getRate = useCallback((ccy: string): number => {
    if (ccy === 'UZS') return 1
    const r = cbuRates.find(r => r.Ccy === ccy)
    return r ? parseFloat(r.Rate) / parseFloat(r.Nominal) : 1
  }, [cbuRates])

  const convertedAmt = (() => {
    const amount = parseFloat(fromAmt) || 0
    const fromRate = getRate(fromCcy)
    const toRate = getRate(toCcy)
    return toRate === 0 ? 0 : (amount * fromRate) / toRate
  })()

  const featured  = FEATURED.map(c => cbuRates.find(r => r.Ccy === c)).filter(Boolean) as CbuRate[]
  const rising    = cbuRates.filter(r => parseFloat(r.Diff) > 0).length
  const falling   = cbuRates.filter(r => parseFloat(r.Diff) < 0).length
  const allCcys   = ['UZS', ...cbuRates.map(r => r.Ccy)]
  const pad2      = (n: number) => String(n).padStart(2, '0')
  const fmtDate   = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`

  const filtered = cbuRates.filter(r =>
    r.Ccy.toLowerCase().includes(search.toLowerCase()) ||
    r.CcyNm_UZ.toLowerCase().includes(search.toLowerCase()) ||
    r.CcyNm_EN.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Export */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors">
          <Download size={14} /> Eksport
        </button>
      </div>

      {/* CBU hero */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)' }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">O'zbekiston Respublikasi Markaziy banki</h2>
            <p className="text-blue-200 text-sm mt-0.5">Rasmiy valyuta kurslari — real vaqtda</p>
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <button
              onClick={() => refetchCbu()}
              disabled={cbuLoading}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw size={13} className={cbuLoading ? 'animate-spin' : ''} />
              Yangilash
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cbuLoading
            ? [1,2,3,4].map(i => <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />)
            : featured.map(r => {
                const diff = parseFloat(r.Diff)
                const up = diff >= 0
                return (
                  <div key={r.Ccy} className="bg-white/10 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                        {r.Ccy.slice(0, 2)}
                      </div>
                      <span className={`text-xs font-medium flex items-center gap-0.5 ${up ? 'text-green-300' : 'text-red-300'}`}>
                        {up ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
                        {Math.abs(diff).toFixed(2)}
                      </span>
                    </div>
                    <p className="font-bold text-sm">{r.Ccy}</p>
                    <p className="text-blue-200 text-xs">{r.CcyNm_UZ}</p>
                    <p className="text-white font-semibold mt-1 text-sm">{parseFloat(r.Rate).toLocaleString('uz-UZ')} so'm</p>
                  </div>
                )
              })
          }
        </div>
      </div>

      {/* Converter */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#00ff88]/10 flex items-center justify-center">
            <RefreshCw size={15} className="text-[#00ff88]" />
          </div>
          <div>
            <p className="text-white font-semibold">Valyuta konvertori</p>
            <p className="text-xs text-gray-500">Markaziy bank kursi asosida</p>
          </div>
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex gap-2 flex-1 min-w-[220px]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Qaysi valyutadan</label>
              <select value={fromCcy} onChange={e => setFromCcy(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition">
                {allCcys.map(c => { const r = cbuRates.find(x => x.Ccy === c); return <option key={c} value={c}>{c}{r ? ` — ${r.CcyNm_UZ}` : " — O'zbek so'mi"}</option> })}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">&nbsp;</label>
              <input type="number" value={fromAmt} onChange={e => setFromAmt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition" />
            </div>
          </div>
          <button onClick={() => { setFromCcy(toCcy); setToCcy(fromCcy) }}
            className="mb-0.5 w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#00ff88] hover:border-[#00ff88] transition-colors shrink-0">
            <RefreshCw size={15} />
          </button>
          <div className="flex gap-2 flex-1 min-w-[220px]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Qaysi valyutaga</label>
              <select value={toCcy} onChange={e => setToCcy(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition">
                {allCcys.map(c => { const r = cbuRates.find(x => x.Ccy === c); return <option key={c} value={c}>{c}{r ? ` — ${r.CcyNm_UZ}` : " — O'zbek so'mi"}</option> })}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">&nbsp;</label>
              <input readOnly value={convertedAmt.toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-white text-xl font-bold">
            {parseFloat(fromAmt || '0').toLocaleString('uz-UZ', { minimumFractionDigits: 2 })} {fromCcy} ={' '}
            <span className="text-[#00ff88]">{convertedAmt.toLocaleString('uz-UZ', { minimumFractionDigits: 2 })} {toCcy}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            1 {fromCcy} = {(getRate(fromCcy) / getRate(toCcy)).toFixed(4)} {toCcy} | Markaziy bank kursi
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Jami valyutalar (CBU)', value: cbuRates.length, icon: '💱' },
          { label: "Kurs ko'tarilgan",      value: rising,          icon: '📈', color: 'text-green-400' },
          { label: 'Kurs tushgan',          value: falling,         icon: '📉', color: 'text-red-400' },
          { label: "So'nggi yangilanish",   value: fmtDate(lastUpdated), icon: '📅', color: 'text-[#00ff88]' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className={`text-xl font-bold ${s.color ?? 'text-white'}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* All CBU rates table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">
            Barcha valyuta kurslari <span className="text-gray-500 font-normal text-sm">({cbuRates.length} ta)</span>
          </h3>
          <input
            type="text"
            placeholder="Valyuta qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:border-[#00ff88] transition placeholder:text-gray-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['№', 'Valyuta', 'Kod', 'Nominal', 'Kurs (UZS)', "O'zgarish", 'Sana'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-medium tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {cbuLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td>
                    ))}</tr>
                  ))
                : filtered.map((r, idx) => {
                    const diff = parseFloat(r.Diff)
                    const up   = diff >= 0
                    const bg   = CCY_COLORS[r.Ccy] ?? '#374151'
                    return (
                      <tr key={r.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-3 text-gray-600 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: bg }}>
                              {r.Ccy.slice(0, 2)}
                            </div>
                            <div>
                              <p className="text-white font-medium">{r.CcyNm_UZ}</p>
                              <p className="text-xs text-gray-500">{r.CcyNm_EN}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">{r.Ccy}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">{r.Nominal}</td>
                        <td className="px-4 py-3 text-white font-semibold">{parseFloat(r.Rate).toLocaleString('uz-UZ')} so'm</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-sm font-medium ${up ? 'text-green-400' : 'text-red-400'}`}>
                            {up ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}
                            {Math.abs(diff).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{r.Date}</td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
