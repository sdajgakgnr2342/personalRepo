import { ref, computed, onUnmounted } from 'vue'

export function useCalculator(options = {}) {
  const { onSingleSubmit } = options

  const display = ref('0')
  const previousValue = ref(null)
  const expressionBase = ref('')
  const operator = ref(null)
  const waitingForOperand = ref(false)
  const pressedLabel = ref(null)

  let pressTimer = null

  const displayText = computed(() => display.value)

  const fullExpression = computed(() => {
    if (!expressionBase.value) {
      if (display.value === '0' || display.value === '错误') return ''
      return display.value
    }
    const base = expressionBase.value.trimEnd()
    if (waitingForOperand.value) return base
    return `${base} ${display.value}`
  })

  function flashKey(label) {
    pressedLabel.value = label
    clearTimeout(pressTimer)
    pressTimer = setTimeout(() => {
      pressedLabel.value = null
    }, 150)
  }

  function handleButtonClick(btn) {
    flashKey(btn.label)
    btn.action()
  }

  onUnmounted(() => {
    clearTimeout(pressTimer)
  })

  function hasPercentSuffix(value) {
    return value.endsWith('%')
  }

  function stripPercent(value) {
    return hasPercentSuffix(value) ? value.slice(0, -1) : value
  }

  function parseDisplayValue(value) {
    const raw = stripPercent(value)
    const num = parseFloat(raw)
    if (Number.isNaN(num)) return NaN
    return hasPercentSuffix(value) ? num / 100 : num
  }

  function getInputValue() {
    return stripPercent(display.value)
  }

  function resetAfterResult() {
    expressionBase.value = ''
    previousValue.value = null
    operator.value = null
  }

  function inputDigit(digit) {
    if (waitingForOperand.value || hasPercentSuffix(display.value)) {
      if (expressionBase.value.includes('=')) resetAfterResult()
      display.value = digit
      waitingForOperand.value = false
      return
    }
    display.value = display.value === '0' ? digit : display.value + digit
  }

  function inputDecimal() {
    if (hasPercentSuffix(display.value)) return
    if (waitingForOperand.value) {
      if (expressionBase.value.includes('=')) resetAfterResult()
      display.value = '0.'
      waitingForOperand.value = false
      return
    }
    if (!display.value.includes('.')) {
      display.value += '.'
    }
  }

  function clearAll() {
    display.value = '0'
    expressionBase.value = ''
    previousValue.value = null
    operator.value = null
    waitingForOperand.value = false
  }

  function toggleSign() {
    if (display.value === '0' || display.value === '错误') return
    const hasPct = hasPercentSuffix(display.value)
    const core = stripPercent(display.value)
    if (core === '0') return
    const signed = core.startsWith('-') ? core.slice(1) : `-${core}`
    display.value = hasPct ? `${signed}%` : signed
  }

  function inputPercent() {
    if (display.value === '0' || display.value === '错误') return
    if (hasPercentSuffix(display.value)) return
    display.value += '%'
  }

  function calculate(a, b, op) {
    switch (op) {
      case '+':
        return a + b
      case '-':
        return a - b
      case '×':
        return a * b
      case '÷':
        return b === 0 ? NaN : a / b
      default:
        return b
    }
  }

  function formatResult(value) {
    if (Number.isNaN(value) || !Number.isFinite(value)) return '错误'
    const str = String(parseFloat(value.toPrecision(12)))
    return str.length > 12 ? value.toExponential(6) : str
  }

  function setOperator(op) {
    const current = parseDisplayValue(display.value)
    if (Number.isNaN(current)) return

    if (waitingForOperand.value && expressionBase.value.includes('=')) {
      expressionBase.value = `${display.value} ${op} `
      previousValue.value = current
    } else if (previousValue.value !== null && operator.value && !waitingForOperand.value) {
      const result = calculate(previousValue.value, current, operator.value)
      display.value = formatResult(result)
      previousValue.value = parseDisplayValue(display.value)
      expressionBase.value = `${display.value} ${op} `
    } else if (waitingForOperand.value) {
      expressionBase.value = expressionBase.value.replace(/\s[+\-×÷]\s*$/, ` ${op} `)
    } else {
      previousValue.value = current
      expressionBase.value = `${display.value} ${op} `
    }

    operator.value = op
    waitingForOperand.value = true
  }

  function handleEquals() {
    if (operator.value === null || previousValue.value === null) {
      const value = getInputValue()
      if (value && value !== '0' && value !== '错误' && onSingleSubmit) {
        onSingleSubmit(value)
      }
      return
    }

    const current = parseDisplayValue(display.value)
    if (Number.isNaN(current)) return

    const result = calculate(previousValue.value, current, operator.value)
    expressionBase.value = `${expressionBase.value.trimEnd()} ${display.value} =`
    display.value = formatResult(result)
    previousValue.value = null
    operator.value = null
    waitingForOperand.value = true
  }

  function handleBackspace() {
    if (waitingForOperand.value) return
    if (display.value.length <= 1 || (display.value.length === 2 && display.value.startsWith('-'))) {
      display.value = '0'
      return
    }
    display.value = display.value.slice(0, -1)
  }

  const buttons = [
    { label: 'C', action: clearAll, class: 'fn' },
    { label: '±', action: toggleSign, class: 'fn' },
    { label: '%', action: inputPercent, class: 'fn' },
    { label: '÷', action: () => setOperator('÷'), class: 'op', operator: '÷' },
    { label: '7', action: () => inputDigit('7') },
    { label: '8', action: () => inputDigit('8') },
    { label: '9', action: () => inputDigit('9') },
    { label: '×', action: () => setOperator('×'), class: 'op', operator: '×' },
    { label: '4', action: () => inputDigit('4') },
    { label: '5', action: () => inputDigit('5') },
    { label: '6', action: () => inputDigit('6') },
    { label: '-', action: () => setOperator('-'), class: 'op', operator: '-' },
    { label: '1', action: () => inputDigit('1') },
    { label: '2', action: () => inputDigit('2') },
    { label: '3', action: () => inputDigit('3') },
    { label: '+', action: () => setOperator('+'), class: 'op', operator: '+' },
    { label: '⌫', action: handleBackspace, class: 'fn wide-half' },
    { label: '0', action: () => inputDigit('0'), class: 'wide-half' },
    { label: '.', action: inputDecimal },
    { label: '=', action: handleEquals, class: 'op equals' },
  ]

  return {
    display,
    operator,
    displayText,
    fullExpression,
    pressedLabel,
    buttons,
    handleButtonClick,
    clearAll,
    getInputValue,
  }
}
