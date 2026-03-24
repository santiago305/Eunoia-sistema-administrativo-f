import Big from "big.js";

export const PRICE_SCALE = 4;
export const MONEY_SCALE = 2;
export const IGV_RATE = new Big("0.18");
export const IGV_DIVISOR = new Big("1.18");

export function toBig(value: string | number | Big) {
  try {
    return new Big(value || 0);
  } catch {
    return new Big(0);
  }
}

export function roundMoney(value: string | number | Big) {
  return toBig(value).round(MONEY_SCALE, Big.roundHalfUp);
}

export function roundPrice(value: string | number | Big) {
  return toBig(value).round(PRICE_SCALE, Big.roundHalfUp);
}