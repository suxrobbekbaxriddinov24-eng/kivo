import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { productsService } from '@/services/products.service'
import { salesService } from '@/services/sales.service'
import type { BarSaleItem } from '@/services/sales.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import type { Product, PaymentMethod } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import type { Option } from '@/components/ui/Select'
import { PAYMENT_METHODS } from '@/lib/constants'
import { Plus, Minus, Trash2, ShoppingCart, CheckCircle } from 'lucide-react'

interface CartItem { product: Product; qty: number }

export default function POSPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()

  const [cart, setCart] = useState<CartItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash')
  const [discountPct, setDiscountPct] = useState(0)

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
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { product, qty: 1 }]
    })
  }

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev
      .map((i) => i.product.id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
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
      setCheckoutOpen(false)
      setDiscountPct(0)
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!categoryFilter ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Barchasi
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${categoryFilter === cat.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            >
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
                    className={`p-4 rounded-xl border text-left transition-all ${cartItem ? 'border-indigo-500 bg-indigo-600/10' : 'border-gray-800 bg-gray-900 hover:border-gray-600'}`}
                  >
                    <p className="text-white font-medium text-sm truncate">{p.name}</p>
                    <p className="text-indigo-400 font-semibold mt-1">{formatCurrency(p.sell_price)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">{p.quantity} ta qoldi</p>
                      {cartItem && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                          {cartItem.qty}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="w-72 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <ShoppingCart size={18} className="text-gray-400" />
          <span className="text-white font-semibold">Savatcha</span>
          {cart.length > 0 && (
            <span className="ml-auto text-xs bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {cart.reduce((s, i) => s + i.qty, 0)}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500 text-sm mt-8">Savatcha bo'sh</p>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-white font-medium leading-tight flex-1">{item.product.name}</p>
                  <button onClick={() => updateQty(item.product.id, -item.qty)} className="text-gray-500 hover:text-red-400 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded-md bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600">
                      <Minus size={12} />
                    </button>
                    <span className="text-white text-sm w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded-md bg-gray-700 text-white flex items-center justify-center hover:bg-gray-600" disabled={item.qty >= item.product.quantity}>
                      <Plus size={12} />
                    </button>
                  </div>
                  <p className="text-indigo-400 text-sm font-semibold">{formatCurrency(item.product.sell_price * item.qty)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-800 space-y-3">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Jami:</span>
              <span className="text-white font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <Button className="w-full" onClick={() => setCheckoutOpen(true)}>
              To'lash
            </Button>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="To'lovni tasdiqlash"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCheckoutOpen(false)}>Bekor</Button>
            <Button
              icon={<CheckCircle size={16} />}
              loading={saleMutation.isPending}
              onClick={() => saleMutation.mutate()}
            >
              To'lash ({formatCurrency(total)})
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="To'lov usuli"
            options={PAYMENT_METHODS as unknown as Option[]}
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">Chegirma (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={discountPct}
              onChange={(e) => setDiscountPct(Number(e.target.value))}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
            {cart.map((i) => (
              <div key={i.product.id} className="flex justify-between text-gray-400">
                <span>{i.product.name} × {i.qty}</span>
                <span>{formatCurrency(i.product.sell_price * i.qty)}</span>
              </div>
            ))}
            <div className="border-t border-gray-700 pt-2 flex justify-between text-white font-semibold">
              <span>Jami</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
