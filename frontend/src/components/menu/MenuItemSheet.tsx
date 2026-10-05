import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client.ts'
import {
  createMenuItem,
  deleteMenuItem,
  removeMenuItemImage,
  updateMenuItem,
  uploadMenuItemImage,
  type MenuItem,
} from '../../api/menu.ts'
import { digitsOnly, formatNumber } from '../../lib/format.ts'
import { shrinkImage } from '../../lib/image.ts'
import Button from '../Button.tsx'
import FormField from '../FormField.tsx'
import Sheet from '../Sheet.tsx'
import Switch from '../Switch.tsx'
import ItemThumb from './ItemThumb.tsx'
import './MenuItemSheet.css'

interface Props {
  /** null = add a new item. */
  item: MenuItem | null
  /** Existing category names, offered as one-tap suggestions. */
  categories: string[]
  onClose: () => void
  /** `warning` is set when the item was saved but its image could not be uploaded. */
  onSaved: (item: MenuItem, isNew: boolean, warning?: string) => void
  onDeleted: (item: MenuItem) => void
}

const FORM_ID = 'menu-item-form'
const MAX_PRICE_DIGITS = 9

/** New image chosen in this form, already shrunk, not uploaded yet. */
interface PendingImage {
  blob: Blob
  previewUrl: string
}

/** Add / edit / delete one menu item. Mount it only while open (the parent passes a key per item). */
export default function MenuItemSheet({ item, categories, onClose, onSaved, onDeleted }: Props) {
  const isNew = item === null
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [priceDigits, setPriceDigits] = useState(item ? String(item.price) : '')
  const [available, setAvailable] = useState(item?.available ?? true)
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The delete button asks for a second tap; forget that after a few seconds.
  useEffect(() => {
    if (!confirmDelete) return
    const timer = window.setTimeout(() => setConfirmDelete(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmDelete])

  // Free the preview's memory when it is replaced or the sheet closes.
  useEffect(() => {
    if (!pendingImage) return
    return () => URL.revokeObjectURL(pendingImage.previewUrl)
  }, [pendingImage])

  async function handleFileChosen(file: File | undefined) {
    if (!file) return
    setProcessingImage(true)
    setFieldErrors((errors) => ({ ...errors, image: '' }))
    try {
      const blob = await shrinkImage(file)
      setPendingImage({ blob, previewUrl: URL.createObjectURL(blob) })
      setImageRemoved(false)
    } catch (err) {
      setFieldErrors((errors) => ({ ...errors, image: err instanceof Error ? err.message : 'Không đọc được ảnh' }))
    } finally {
      setProcessingImage(false)
      // Allow choosing the same file again.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeImage() {
    setPendingImage(null)
    setImageRemoved(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!name.trim()) errors.name = 'Vui lòng nhập tên món'
    if (!priceDigits) errors.price = 'Vui lòng nhập giá'
    setFieldErrors(errors)
    setFormError(null)
    if (Object.keys(errors).length > 0) return

    setSaving(true)
    const input = { name: name.trim(), category: category.trim() || null, price: Number(priceDigits), available }
    let saved: MenuItem
    try {
      saved = isNew ? await createMenuItem(input) : await updateMenuItem(item.id, input)
    } catch (err) {
      showError(err)
      setSaving(false)
      return
    }
    // The item itself is saved now; an image error must not make the user save it twice.
    try {
      if (pendingImage) saved = await uploadMenuItemImage(saved.id, pendingImage.blob)
      else if (imageRemoved && saved.imageUrl) saved = await removeMenuItemImage(saved.id)
      onSaved(saved, isNew)
    } catch (err) {
      onSaved(saved, isNew, `Đã lưu món nhưng chưa cập nhật được ảnh: ${err instanceof Error ? err.message : ''}`)
    }
  }

  async function handleDelete() {
    if (!item) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await deleteMenuItem(item.id)
      onDeleted(item)
    } catch (err) {
      showError(err)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function showError(err: unknown) {
    if (err instanceof ApiError && err.fields) {
      setFieldErrors(err.fields)
    } else {
      setFormError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    }
  }

  const busy = saving || deleting
  const currentImageUrl = imageRemoved ? null : (item?.imageUrl ?? null)
  const hasImage = pendingImage !== null || currentImageUrl !== null

  return (
    <Sheet
      open
      title={isNew ? 'Thêm món' : 'Sửa món'}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <Button
              variant="danger"
              icon="trash"
              className={confirmDelete ? 'is-confirming' : undefined}
              loading={deleting}
              disabled={saving}
              onClick={handleDelete}
            >
              {confirmDelete ? 'Bấm lần nữa để xóa' : 'Xóa'}
            </Button>
          )}
          <span className="spacer" />
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="primary"
            loading={saving}
            disabled={deleting || processingImage}
          >
            {isNew ? 'Thêm món' : 'Lưu'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="notice notice-danger" role="alert">
            {formError}
          </div>
        )}

        <div className="image-picker">
          <ItemThumb
            name={name || 'Món mới'}
            category={category || null}
            imageUrl={currentImageUrl}
            previewUrl={pendingImage?.previewUrl}
            size="lg"
          />
          <div className="image-picker-actions">
            <span className="image-picker-label">Ảnh món</span>
            <div className="image-picker-buttons">
              <Button
                icon="image"
                loading={processingImage}
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                {hasImage ? 'Đổi ảnh' : 'Chọn ảnh'}
              </Button>
              {hasImage && (
                <Button variant="ghost" icon="trash" disabled={busy || processingImage} onClick={removeImage}>
                  Bỏ ảnh
                </Button>
              )}
            </div>
            {fieldErrors.image ? (
              <div className="field-error">{fieldErrors.image}</div>
            ) : (
              <div className="field-hint">Ảnh vuông nhìn đẹp nhất. Ảnh được tự thu nhỏ trước khi tải lên.</div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => void handleFileChosen(e.target.files?.[0])}
          />
        </div>

        <FormField
          label="Tên món"
          name="name"
          autoFocus={isNew}
          maxLength={100}
          placeholder="VD: Cà phê sữa đá"
          value={name}
          error={fieldErrors.name}
          onChange={(e) => setName(e.target.value)}
        />

        <FormField
          label="Giá bán"
          name="price"
          inputMode="numeric"
          placeholder="VD: 25.000"
          suffix="đ"
          value={priceDigits ? formatNumber(Number(priceDigits)) : ''}
          error={fieldErrors.price}
          onChange={(e) => setPriceDigits(digitsOnly(e.target.value).replace(/^0+(?=\d)/, '').slice(0, MAX_PRICE_DIGITS))}
        />

        <FormField
          label="Nhóm"
          name="category"
          maxLength={50}
          placeholder="VD: Cà phê, Trà, Bánh..."
          hint={categories.length > 0 ? undefined : 'Nhóm giúp tìm món nhanh hơn khi bán hàng'}
          value={category}
          error={fieldErrors.category}
          onChange={(e) => setCategory(e.target.value)}
        />
        {categories.length > 0 && (
          <div className="chip-row suggestion-chips" aria-label="Chọn nhanh nhóm">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className={c === category.trim() ? 'chip is-active' : 'chip'}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="toggle-row">
          <div>
            <div className="toggle-row-label">Đang bán</div>
            <div className="muted toggle-row-hint">Tắt khi món tạm hết nguyên liệu</div>
          </div>
          <Switch checked={available} onChange={setAvailable} label="Đang bán" />
        </div>
      </form>
    </Sheet>
  )
}
