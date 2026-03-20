import { motion } from "framer-motion"

export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel
}: any) {

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 p-6 rounded-xl w-80 space-y-4 border border-slate-700"
      >
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-slate-400">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="text-xs bg-red-600 px-3 py-1 rounded cursor-pointer hover:bg-red-500"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  )
}