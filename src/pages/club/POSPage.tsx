import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { productsService } from '@/services/products.service'
import { customersService } from '@/services/customers.service'
import { salesService } from '@/services/sales.service'
import type { BarSaleItem } from '@/services/sales.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import type { Product, Customer, PaymentMethod } from '@/types/database'
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle, X, User } from 'lucide-react'

interface CartItem { product: Product; qty: number }

export default function POSPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id ?? ''
  const qc = useQueryClient()

  const [cart, setCart] = useState<CartItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [discountPct, setDiscountPct] = useState(0)
  const [customerPhone, setCustomerPhone] = useState('')
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null)
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Debounced phone search — fires 400ms after user stops typing
  useEffect(() => {
    const digits = customerPhone.replace(/\D/g, '')
    if (digits.length < 2) { setFoundCustomer(null); return }
    setSearching(true)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await customersService.list(clubId, { search: digits })
        setFoundCustomer(results.length > 0 ? results[0] : null)
      } catch { setFoundCustomer(null) }
      setSearching(false)
    }, 400)
    return () => clearTimeout(searchTimer.current)
  }, [customerPhone, clubId])

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', clubId],
    queryFn: () => productsService.list(clubId),
    enabled: !!clubId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['product_categories', clubId],
    queryFn: () => productsService.listCategories(clubId),
    enabled: !!clubId,
  })

  const visibleProducts = categoryFilter
    ? products.filter((p) => p.category_id === categoryFilter && p.status === 'active' && p.quantity > 0)
    : products.filter((p) => p.status === 'active' && p.quantity > 0)

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        // H-5: Don't exceed available stock
        if (existing.qty >= product.quantity) return prev
        return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev
      .map((i) => {
        if (i.product.id !== productId) return i
        // H-5: Clamp to [0, available stock]
        const newQty = Math.max(0, Math.min(i.qty + delta, i.product.quantity))
        return { ...i, qty: newQty }
      })
      .filter((i) => i.qty > 0)
    )
  }

  const subtotal = cart.reduce((s, i) => s + i.product.sell_price * i.qty, 0)
  const discountAmount = subtotal * (discountPct / 100)
  const total = subtotal - discountAmount

  const saleMutation = useMutation({
    mutationFn: () => {
      const items: BarSaleItem[] = cart.map((i) => ({
        product_id: i.product.id,
        product_name: i.product.name,
        quantity: i.qty,
        unit_price: i.product.sell_price,
        purchase_price: i.product.purchase_price,
      }))
      return salesService.createBarSale({
        club_id: clubId,
        items,
        payment_method: payMethod,
        discount_pct: discountPct,
        sold_by: profile!.id,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', clubId] })
      qc.invalidateQueries({ queryKey: ['stats', clubId] })
      toast.success(`Sotuv amalga oshirildi — ${formatCurrency(total)}`)
      setCart([])
      setDiscountPct(0)
      setCustomerPhone('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="flex gap-5 h-[calc(100vh-7rem)]">
      {/* Products grid */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${!categoryFilter ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
          >
            🛒 Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${categoryFilter === cat.id ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'}`}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-500">Mahsulot topilmadi</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleProducts.map((p) => {
                const cartItem = cart.find((i) => i.product.id === p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`rounded-xl border text-left transition-all overflow-hidden flex flex-col ${cartItem ? 'border-[#00ff88] bg-[#00ff88]/10' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}`}
                  >
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-28 object-cover" />
                    ) : (
                      <div className="w-full h-28 bg-gray-800 flex items-center justify-center">
                        <span className="text-3xl">{p.category?.icon ?? '📦'}</span>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-white font-medium text-sm truncate">{p.name}</p>
                      <p className="text-[#00ff88] font-semibold mt-0.5">{formatCurrency(p.sell_price)}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className="text-xs text-gray-500">{p.quantity} ta qoldi</p>
                        {cartItem && (
                          <span className="w-5 h-5 rounded-full bg-[#00ff88] text-white text-xs flex items-center justify-center font-bold">
                            {cartItem.qty}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-80 flex flex-col shrink-0 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <ShoppingCart size={17} className="text-gray-400" />
          <span className="text-white font-semibold flex-1">Savatcha</span>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
              title="Savatni tozalash"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        {/* Customer phone search */}
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">Mijoz (ixtiyoriy)</p>
          {foundCustomer ? (
            <div className="flex items-center gap-2 bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-lg px-3 py-2">
              {foundCustomer.photo_url ? (
                <img src={foundCustomer.photo_url} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                  <User size={13} className="text-[#00ff88]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{foundCustomer.first_name} {foundCustomer.last_name}</p>
                <p className="text-[#00ff88] text-xs">{customerPhone}</p>
              </div>
              <button onClick={() => { setCustomerPhone(''); setFoundCustomer(null) }}
                className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className={`flex-1 flex items-center gap-2 bg-gray-800 border rounded-lg px-3 py-2 transition-colors ${searching ? 'border-[#00ff88]/50' : 'border-gray-700'}`}>
                <span className="text-red-400 text-xs">📞</span>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                    let formatted = digits
                    if (digits.length > 2) formatted = digits.slice(0,2) + '-' + digits.slice(2)
                    if (digits.length > 5) formatted = digits.slice(0,2) + '-' + digits.slice(2,5) + '-' + digits.slice(5)
                    if (digits.length > 7) formatted = digits.slice(0,2) + '-' + digits.slice(2,5) + '-' + digits.slice(5,7) + '-' + digits.slice(7)
                    setCustomerPhone(formatted)
                  }}
                  placeholder="90-123-12-22"
                  maxLength={12}
                  className="flex-1 bg-transparent text-white text-sm placeholder:text-gray-600 focus:outline-none"
                />
                {searching && <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />}
              </div>
            </div>
          )}
          {customerPhone.replace(/\D/g, '').length >= 2 && !foundCustomer && !searching && (
            <p className="text-xs text-gray-500 mt-1">Mijoz topilmadi</p>
          )}
        </div>

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 gap-3">
              <ShoppingCart size={48} className="text-gray-700" />
              <p className="text-gray-500 text-sm font-medium">Savatcha bo'sh</p>
              <p className="text-gray-600 text-xs text-center">Mahsulot qo'shish uchun chapdan tanlang</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-3 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center shrink-0 text-sm">
                        {item.product.category?.icon ?? '📦'}
                      </div>
                    )}
                    <p className="text-sm text-white font-medium leading-tight truncate">{item.product.name}</p>
                  </div>
                  <button onClick={() => updateQty(item.product.id, -item.qty)} className="text-gray-600 hover:text-red-400 shrink-0 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-white text-sm w-7 text-center font-medium">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} disabled={item.qty >= item.product.quantity} className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center transition-colors disabled:opacity-40">
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-[#00ff88] text-sm font-bold">{formatCurrency(item.product.sell_price * item.qty)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer — always visible */}
        <div className="border-t border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Jami:</span>
            <span className="text-gray-300">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-base">TO'LOV:</span>
            <span className="text-[#00ff88] font-bold text-xl">{formatCurrency(total)}</span>
          </div>

          {/* Payment method toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPayMethod('cash')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                payMethod === 'cash'
                  ? 'bg-[#00ff88] border-[#00ff88] text-gray-950'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              💵 Naqd
            </button>
            <button
              onClick={() => setPayMethod('card')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                payMethod === 'card'
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              💳 Karta
            </button>
          </div>

          <button
            onClick={() => cart.length > 0 && saleMutation.mutate()}
            disabled={cart.length === 0 || saleMutation.isPending}
            className="w-full py-3 rounded-xl font-bold text-sm tracking-wide transition-all bg-[#00cc6a] hover:bg-[#00ff88] text-gray-950 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saleMutation.isPending ? 'Saqlanmoqda...' : 'SOTUVNI YAKUNLASH'}
          </button>
        </div>
      </div>
    </div>
  )
}
