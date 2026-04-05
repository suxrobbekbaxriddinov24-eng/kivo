import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Trash2, Edit2, Star, RefreshCw, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Currency } from '@/types/database'

// CBU API
const CBU_API = 'https://cbu.uz/uz/arkhiv-kursov-valyut/json/'

interface CbuRate {
  id: string
  Code: string
  Ccy: string
  CcyNm_UZ: string
  CcyNm_RU: string
  CcyNm_EN: string
  Nominal: string
  Rate: string
  Diff: string
  Date: string
}

const FEATURED = ['USD', 'EUR', 'GBP', 'RUB']

const schema = z.object({
  code:       z.string().min(1).max(5),
  name:       z.string().min(1),
  symbol:     z.string().min(1),
  rate:       z.coerce.number().min(0),
  is_default: z.boolean(),
})
type FormData = z.infer<typeof schema>

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${pad(time.getDate())}.${pad(time.getMonth() + 1)}.${time.getFullYear()}`
  const clock = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-mono">{date}</span>
      <span className="bg-white/10 text-white px-2.5 py-1 rounded-lg font-mono">{clock}</span>
    </div>
  )
}

export default function CurrenciesPage() {
  const qc = useQueryClient()
  const [open, setOpen]               = useState(false)
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [fromCcy, setFromCcy]         = useState('UZS')
  const [toCcy, setToCcy]             = useState('USD')
  const [fromAmt, setFromAmt]         = useState('1000000')
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // CBU rates
  const { data: cbuRates = [], isLoading: cbuLoading, refetch: refetchCbu } = useQuery<CbuRate[]>({
    queryKey: ['cbu-rates'],
    queryFn: async () => {
      const res = await fetch(CBU_API)
      if (!res.ok) throw new Error('CBU API error')
      const data = await res.json()
      setLastUpdated(new Date())
      return data
    },
    refetchInterval: 60 * 60 * 1000, // every hour
    staleTime: 30 * 60 * 1000,
  })

  // DB currencies (for tariff selector etc.)
  const { data: currencies = [] } = useQuery({ queryKey: ['currencies'], queryFn: adminService.listCurrencies })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { is_default: false, rate: 1 },
  })

  // Converter logic
  const getRate = useCallback((ccy: string): number => {
    if (ccy === 'UZS') return 1
    const r = cbuRates.find(r => r.Ccy === ccy)
    return r ? parseFloat(r.Rate) / parseFloat(r.Nominal) : 1
  }, [cbuRates])

  const convertedAmt = (() => {
    const amount = parseFloat(fromAmt) || 0
    const fromRate = getRate(fromCcy)
    const toRate = getRate(toCcy)
    if (toRate === 0) return 0
    return (amount * fromRate) / toRate
  })()

  const swapCurrencies = () => {
    setFromCcy(toCcy)
    setToCcy(fromCcy)
  }

  const featured = FEATURED.map(code => cbuRates.find(r => r.Ccy === code)).filter(Boolean) as CbuRate[]

  const rising  = cbuRates.filter(r => parseFloat(r.Diff) > 0).length
  const falling = cbuRates.filter(r => parseFloat(r.Diff) < 0).length

  const pad2 = (n: number) => String(n).padStart(2, '0')
  const fmtDate = (d: Date) => `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`

  const openEdit = (c: Currency) => {
    setEditCurrency(c)
    setValue('code', c.code); setValue('name', c.name); setValue('symbol', c.symbol)
    setValue('rate', c.rate); setValue('is_default', c.is_default)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editCurrency ? adminService.updateCurrency(editCurrency.id, data) : adminService.createCurrency(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies'] })
      toast.success(editCurrency ? 'Yangilandi' : "Valyuta qo'shildi")
      reset(); setOpen(false); setEditCurrency(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteCurrency,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies'] })
      toast.success("O'chirildi")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  // All currencies for converter (UZS + CBU list)
  const allCcys = ['UZS', ...cbuRates.map(r => r.Ccy)]

  return (
    <div className="space-y-4">
      {/* Top right export btn */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors">
          <Download size={14} /> Eksport
        </button>
      </div>

      {/* CBU hero card */}
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

        {/* Featured currencies */}
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2 flex-1 min-w-[200px]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Qaysi valyutadan</label>
              <select
                value={fromCcy}
                onChange={e => setFromCcy(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition"
              >
                {allCcys.map(c => {
                  const r = cbuRates.find(x => x.Ccy === c)
                  return <option key={c} value={c}>{c}{r ? ` — ${r.CcyNm_UZ}` : " — O'zbek so'mi"}</option>
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">&nbsp;</label>
              <input
                type="number"
                value={fromAmt}
                onChange={e => setFromAmt(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition"
              />
            </div>
          </div>

          <button
            onClick={swapCurrencies}
            className="mt-4 w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-gray-400 hover:text-[#00ff88] hover:border-[#00ff88] transition-colors shrink-0"
          >
            <RefreshCw size={15} />
          </button>

          <div className="flex gap-2 flex-1 min-w-[200px]">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Qaysi valyutaga</label>
              <select
                value={toCcy}
                onChange={e => setToCcy(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition"
              >
                {allCcys.map(c => {
                  const r = cbuRates.find(x => x.Ccy === c)
                  return <option key={c} value={c}>{c}{r ? ` — ${r.CcyNm_UZ}` : " — O'zbek so'mi"}</option>
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500">&nbsp;</label>
              <input
                readOnly
                value={convertedAmt.toLocaleString('uz-UZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                className="w-full bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Result */}
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

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Jami valyutalar (CBU)', value: cbuRates.length, icon: '💱' },
          { label: "Kurs ko'tarilgan", value: rising, icon: '📈', color: 'text-green-400' },
          { label: 'Kurs tushgan', value: falling, icon: '📉', color: 'text-red-400' },
          { label: "So'nggi yangilanish", value: fmtDate(lastUpdated), icon: '📅', color: 'text-[#00ff88]' },
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

      {/* DB Currencies (saved) */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Saqlangan valyutalar <span className="text-gray-500 font-normal text-sm">({currencies.length})</span></h3>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => { reset(); setEditCurrency(null); setOpen(true) }}>
            Valyuta qo'shish
          </Button>
        </div>
        {currencies.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">Hali valyutalar qo'shilmagan</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {currencies.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-lg bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] font-bold text-sm">
                  {c.symbol}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium flex items-center gap-2">
                    {c.code} — {c.name}
                    {c.is_default && <Star size={13} className="text-yellow-400 fill-yellow-400" />}
                  </p>
                  <p className="text-xs text-gray-400">1 {c.code} = {c.rate.toLocaleString()} UZS</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:text-[#00ff88] hover:bg-gray-800 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditCurrency(null); reset() }}
        title={editCurrency ? 'Valyutani tahrirlash' : "Yangi valyuta qo'shish"}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setOpen(false); setEditCurrency(null); reset() }}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit(d => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kod (USD, EUR...)" error={errors.code?.message} {...register('code')} />
            <Input label="Belgi ($, €...)" error={errors.symbol?.message} {...register('symbol')} />
          </div>
          <Input label="To'liq nomi" error={errors.name?.message} {...register('name')} />
          <Input label="Kurs (1 valyuta = ? UZS)" type="number" error={errors.rate?.message} {...register('rate')} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#00ff88]" {...register('is_default')} />
            <span className="text-sm text-gray-300">Asosiy valyuta sifatida belgilash</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Valyutani o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
