export function isAlphaSpace(value: string) {
  return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(value);
}

export function isValidEmail(email: string) {
  const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
  return re.test(String(email).toLowerCase());
}

// Ecuadorian cédula validation (basic)
export function isValidEcuadorianID(id: string) {
  if (!/^[0-9]+$/.test(id)) return false;
  if (id.length === 10) {
    const province = parseInt(id.substring(0, 2), 10);
    if (province < 1 || province > 24) return false;
    const third = parseInt(id.charAt(2), 10);
    if (third >= 6) return false;
    const coefficients = [2,1,2,1,2,1,2,1,2];
    let total = 0;
    for (let i = 0; i < coefficients.length; i++) {
      let val = parseInt(id.charAt(i), 10) * coefficients[i];
      if (val >= 10) val -= 9;
      total += val;
    }
    const checkDigit = parseInt(id.charAt(9), 10);
    const decena = Math.ceil(total / 10) * 10;
    const calc = decena - total;
    return calc === checkDigit || (total % 10 === 0 && checkDigit === 0);
  }

  // RUC for natural person (13 digits) - basic check: first 10 digits valid and last 3 > 0
  if (id.length === 13) {
    const first10 = id.substring(0,10);
    const suffix = id.substring(10);
    if (!isValidEcuadorianID(first10)) return false;
    return parseInt(suffix,10) > 0;
  }

  return false;
}

export function isValidEcuadorPhone(phone: string) {
  // Ecuador mobile: starts with 09 and 10 digits total
  return /^09[0-9]{8}$/.test(phone);
}
