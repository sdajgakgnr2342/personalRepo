const sanitizeHtml = require('sanitize-html');

const ALLOWED_TAGS = [
  'p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'img', 'a', 'font',
];

const ALLOWED_ATTRIBUTES = {
  '*': ['style', 'class'],
  div: ['class', 'style'],
  img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'class'],
  a: ['href', 'title', 'target', 'rel'],
  font: ['color', 'size', 'face'],
};

function isSafeImgSrc(src) {
  if (!src) return false;
  if (src.startsWith('/api/items/attachments/') || src.startsWith('/uploads/')) return true;
  try {
    const url = new URL(src, 'https://example.com');
    return ['http:', 'https:', 'data:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeNoteHtml(html) {
  if (!html) return '';
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto', 'data'],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
      img: (tagName, attribs) => {
        if (!isSafeImgSrc(attribs.src)) {
          delete attribs.src;
        }
        return { tagName, attribs };
      },
    },
  });
}

module.exports = { sanitizeNoteHtml };
