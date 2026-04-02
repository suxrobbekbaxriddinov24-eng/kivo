import Modal from './Modal'
import Button from './Button'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  confirmLabel?: string
  loading?: boolean
}

export default function ConfirmDialog({
  open, onClose, onConfirm, loading,
  title = 'Tasdiqlash',
  message = 'Haqiqatan ham davom etmoqchimisiz?',
  confirmLabel = "O'chirish",
}: Props) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-gray-300">{message}</p>
    </Modal>
  )
}
