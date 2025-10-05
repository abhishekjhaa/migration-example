/**
 * Generate a unique invoice number
 */
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const sequenceStr = String(sequence).padStart(4, '0');
  return `INV-${year}${month}-${sequenceStr}`;
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * taxRate * 100) / 100;
}

/**
 * Calculate total amount
 */
export function calculateTotal(subtotal: number, tax: number, discount: number = 0): number {
  return Math.round((subtotal + tax - discount) * 100) / 100;
}
