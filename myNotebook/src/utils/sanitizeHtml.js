import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'img', 'a', 'font',
]

const ALLOWED_ATTR = ['style', 'class', 'src', 'alt', 'title', 'width', 'height', 'loading', 'href', 'target', 'rel', 'color', 'size', 'face']

export function sanitizeNoteHtml(html) {
  if (!html) return ''
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|data):|\/(?:api\/items\/attachments|uploads)\/)/i,
  })
}
